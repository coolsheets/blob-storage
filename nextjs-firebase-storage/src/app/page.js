'use client'

import { useState, useEffect } from "react";

//FIREBASSE STUFF
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
  //Function for file viewing (clicking the title)
  const handleFileChange = (event) => {
    if (event.target.files[0]) {
      setFile(event.target.files[0]);
      setPreviewUrl(URL.createObjectURL(event.target.files[0]));
    }
  };

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

  return (
    <div>
      <h1>Dank Meme Storage</h1>
      {user ? (
        <div>
          <p>Welcome, {user.displayName}</p>
          <button onClick={signOutUser}>Sign Out</button>
          <input type="file" onChange={handleFileChange} />
          {previewUrl && (
            <div>
              <p>Preview:</p>
              <img src={previewUrl} alt="Preview" width="200" />
            </div>
          )}
          <button onClick={handleUpload} disabled={uploading}>
            {uploading ? `Uploading... ${Math.round(uploadProgress)}%` : "Upload"}
          </button>
          <ul>
            {files.map((file) => (
              <li key={file.name}>
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                  {file.name}
                </a>
                {file.url.match(/\.(jpeg|jpg|gif|png)$/) && (
                  <div>
                    <img src={file.url} alt={file.name} width="100" />
                  </div>
                )}
                <button onClick={() => handleDownload(file.url, file.name)}>Download</button>
                <button onClick={() => handleDelete(file.name)}>Delete</button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <button onClick={signIn}>Sign In with Google</button>
      )}
    </div>
  );
}

