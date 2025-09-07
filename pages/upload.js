import { useState } from "react";

export default function UploadPage() {
    
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState("");
    const [uploads, setUploads] = useState([]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
        });

        const data = await res.json();
        setMessage(data.message);

        setUploads([...uploads, URL.createObjectURL(file)]);
        setFile(null);
    };

    return (
        <div>

            <h1>
                Upload Your Freestyle
            </h1>
            <form onSubmit={handleSubmit}>
                <input
                    type="file"
                    accept="video/*,audio/*"
                    onChange={(e) => setFile(e.target.files[0])}
                />
                <button type="submit">
                    Upload
                </button>
            </form>

            <p>{message}</p>

            <h2>
                Uploaded Freestyles (preview only)
            </h2>
            {uploads.map((src,index) => (
                <div key={index}>
                    <video
                        src={src}
                        controls
                        width="300"
                    />
                </div>
            ))}
        </div>
    );
}