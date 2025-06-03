'use client'

import { useState, useEffect } from "react";

//FIREBASE STUFF
import { storage, auth } from "../../firebaseConfig"; // Adjust the import path as necessary
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  listAll,
  deleteObject,
} from "firebase/storage";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from "firebase/auth";

export default function Home() {
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [user, setUser] = useState(null);

  //AUTHENTICATION FUNCTIONS
  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  //FILE FUNCTIONS
  //Function for dealing with uploading new files
  const handleUpload = () => {
    if (!file || !user) return;

    setUploading(true);
    setUploadProgress(0);

    const storageRef = ref(storage, `uploads/${user.uid}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        setUploading(false);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          setFiles((prev) => [...prev, { name: file.name, url: downloadURL }]);
          setFile(null);
          setPreviewUrl(null);
          setUploading(false);
        });
      }
    );
  };

  //Function for deleting individual files
  const handleDelete = async (fileName) => {
    const fileRef = ref(storage, `uploads/${user.uid}/${fileName}`);
    try {
      await deleteObject(fileRef);
      setFiles(files.filter((file) => file.name !== fileName));
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  //Function for downloading files (currently works like the file viewing function)
  const handleDownload = (fileUrl, fileName) => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  //On initial load, set auth as user
  useEffect(() => {
    auth.onAuthStateChanged(setUser);
  }, []);

  //If the user changes fetch their specific files
  useEffect(() => {
    if (!user) return;
    const fetchFiles = async () => {
      const storageRef = ref(storage, `uploads/${user.uid}`);
      const res = await listAll(storageRef);
      const fileList = await Promise.all(
        res.items.map(async (item) => {
          const url = await getDownloadURL(item);
          return { name: item.name, url };
        })
      );
      setFiles(fileList);
    };
    fetchFiles();
  }, [user]);

  // Limit file size to 12MB (change as needed)
  const MAX_FILE_SIZE = 12 * 1024 * 1024; // 5MB

  // Show error if file too large
  const [fileError, setFileError] = useState(null);

  // Modified file change handler to check file size
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > MAX_FILE_SIZE) {
        setFileError("File size exceeds 12MB limit.");
        setFile(null);
        setPreviewUrl(null);
      } else {
        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
        setFileError(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Dank Meme Storage</h1>
      {user ? (
        <div className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-lg shadow p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Welcome, {user.displayName}</p>
            <button
              onClick={signOutUser}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
            >
              Sign Out
            </button>
          </div>
          <div>
            <input
              type="file"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {fileError && (
              <p className="text-red-500 mt-2">{fileError}</p>
            )}
          </div>
          {previewUrl && (
            <div>
              <p className="font-medium mb-2">Preview:</p>
              {file && file.type.startsWith("image/") ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="rounded border w-48 mb-2"
                />
              ) : file && file.type === "application/pdf" ? (
                <embed
                  src={previewUrl}
                  width="400"
                  height="300"
                  type="application/pdf"
                  className="rounded border mb-2"
                />
              ) : (
                <p className="text-gray-500">Preview not available for this file type.</p>
              )}
            </div>
          )}
          <button
            onClick={handleUpload}
            disabled={uploading || !!fileError}
            className={`w-full py-2 rounded font-semibold ${
              uploading || !!fileError
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 transition"
            }`}
          >
            {uploading ? `Uploading... ${Math.round(uploadProgress)}%` : "Upload"}
          </button>
          <ul className="divide-y divide-gray-200">
            {files.map((file) => (
              <li key={file.name} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* File preview thumbnail */}
                  {/\.(jpeg|jpg|gif|png)$/i.test(file.name) ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-12 h-12 object-cover rounded border"
                    />
                  ) : /\.pdf$/i.test(file.name) ? (
                    <span className="w-12 h-12 flex items-center justify-center bg-gray-100 border rounded text-gray-500 text-xs font-mono">
                      PDF
                    </span>
                  ) : (
                    <span className="w-12 h-12 flex items-center justify-center bg-gray-100 border rounded text-gray-400 text-xs font-mono">
                      File
                    </span>
                  )}
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {file.name}
                  </a>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(file.url, file.name)}
                    className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(file.name)}
                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <button
          onClick={signIn}
          className="px-6 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition"
        >
          Sign In with Google
        </button>
      )}
    </div>
  );
}

