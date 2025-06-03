'use client'

import { useState, useEffect, useRef } from "react";

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
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [fileError, setFileError] = useState(null);
  const dropRef = useRef(null);

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
    if (!filesToUpload.length || !user) return;
    setUploading(true);
    setUploadProgress(0);

    const uploadPromises = filesToUpload.map((file) => {
      const storageRef = ref(storage, `uploads/${user.uid}/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => reject(error),
          () => {
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
              resolve({ name: file.name, url: downloadURL });
            });
          }
        );
      });
    });

    Promise.all(uploadPromises)
      .then((uploadedFiles) => {
        setFiles((prev) => [...prev, ...uploadedFiles]);
        setFilesToUpload([]);
        setFile(null);
        setPreviewUrl(null);
        setUploading(false);
      })
      .catch((error) => {
        console.error("Upload failed:", error);
        setUploading(false);
      });
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

  // Recursive pattern matching for allowed file types
  const allowedPatterns = [/\.(jpeg|jpg|gif|png|pdf)$/i];

  function matchesAllowedPatterns(fileName) {
    return allowedPatterns.some((pattern) => pattern.test(fileName));
  }

  // Modified file change handler for multiple files
  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    handleNewFiles(selectedFiles);
  };

  // Handle files from drag-and-drop or input
  function handleNewFiles(selectedFiles) {
    const validFiles = [];
    let error = null;
    selectedFiles.forEach((file) => {
      if (!matchesAllowedPatterns(file.name)) {
        error = `File type not allowed: ${file.name}`;
      } else if (file.size > MAX_FILE_SIZE) {
        error = `File size exceeds 12MB: ${file.name}`;
      } else {
        validFiles.push(file);
      }
    });
    setFileError(error);
    if (validFiles.length > 0) {
      setFilesToUpload((prev) => [...prev, ...validFiles]);
      setPreviewUrl(URL.createObjectURL(validFiles[0])); // Preview first file
      setFile(validFiles[0]);
    }
  }

  // Drag and drop handlers
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleNewFiles(droppedFiles);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropRef.current) dropRef.current.classList.add("ring-2", "ring-blue-400");
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropRef.current) dropRef.current.classList.remove("ring-2", "ring-blue-400");
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
          {/* Drag and drop zone */}
          <div
            ref={dropRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className="mb-4 p-4 border-2 border-dashed border-gray-300 rounded bg-gray-50 dark:bg-zinc-800 text-center cursor-pointer"
          >
            <p className="text-sm text-gray-500">Drag and drop files here, or click to select files</p>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          {fileError && (
            <p className="text-red-500 mt-2">{fileError}</p>
          )}
          {/* Show previews for filesToUpload */}
          {filesToUpload.length > 0 && (
            <div className="flex flex-wrap gap-4 mb-4">
              {filesToUpload.map((file, idx) =>
                file.type.startsWith("image/") ? (
                  <img
                    key={idx}
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-16 h-16 object-cover rounded border"
                  />
                ) : file.type === "application/pdf" ? (
                  <span
                    key={idx}
                    className="w-16 h-16 flex items-center justify-center bg-gray-100 border rounded text-gray-500 text-xs font-mono"
                  >
                    PDF
                  </span>
                ) : (
                  <span
                    key={idx}
                    className="w-16 h-16 flex items-center justify-center bg-gray-100 border rounded text-gray-400 text-xs font-mono"
                  >
                    File
                  </span>
                )
              )}
            </div>
          )}
          <button
            onClick={handleUpload}
            disabled={uploading || !!fileError || filesToUpload.length === 0}
            className={`w-full py-2 rounded font-semibold ${
              uploading || !!fileError || filesToUpload.length === 0
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

