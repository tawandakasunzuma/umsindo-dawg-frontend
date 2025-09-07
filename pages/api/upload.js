import formidable from "formidable";

export const config = {
    api: {
        bodyParser: false, // Next.js should not parse the body, formidable does it
    },
};

export default async function handler (request, response) {
    if (request.method === "POST") {
        const form = formidable({ multiples:false });

        form.parse(request, (error, fields, files) => {
            if (error) {
                console.error(error);
                response.status(500).json({ message: "Upload failed." });
                return;
            }

            // Right now we are not saving the file to disk, bit responding with success.
            response.status(200).json({ message: "Upload success!" });
        });
    } else {
        response.status(405).json({ message: "Method not allowed" })
    };
};