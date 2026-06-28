export const parseMultipart = (req) => {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"] || "";
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!boundaryMatch) {
      return reject(new Error("No boundary found in content-type"));
    }
    const boundary = boundaryMatch[1] || boundaryMatch[2];
    const boundaryBuffer = Buffer.from(`--${boundary}`);

    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const buffer = Buffer.concat(chunks);
        const parts = [];
        let startIdx = 0;

        while (true) {
          const nextBoundaryIdx = buffer.indexOf(boundaryBuffer, startIdx);
          if (nextBoundaryIdx === -1) break;

          if (startIdx > 0) {
            const part = buffer.subarray(startIdx, nextBoundaryIdx);
            parts.push(part);
          }

          startIdx = nextBoundaryIdx + boundaryBuffer.length;
        }

        const result = { files: {}, fields: {} };

        for (const part of parts) {
          const headerEndIdx = part.indexOf(Buffer.from("\r\n\r\n"));
          if (headerEndIdx === -1) continue;

          const headerStr = part.subarray(0, headerEndIdx).toString();
          const bodyContent = part.subarray(headerEndIdx + 4);
          
          // Remove trailing \r\n
          let cleanedBody = bodyContent;
          if (bodyContent.length >= 2 && bodyContent[bodyContent.length - 2] === 13 && bodyContent[bodyContent.length - 1] === 10) {
            cleanedBody = bodyContent.subarray(0, bodyContent.length - 2);
          }

          const nameMatch = headerStr.match(/name="([^"]+)"/);
          const filenameMatch = headerStr.match(/filename="([^"]+)"/);
          const contentTypeMatch = headerStr.match(/Content-Type:\s*([^\s\r\n]+)/i);

          if (nameMatch) {
            const name = nameMatch[1];
            if (filenameMatch) {
              const filename = filenameMatch[1];
              const mimeType = contentTypeMatch ? contentTypeMatch[1] : "application/octet-stream";
              result.files[name] = {
                filename,
                mimeType,
                buffer: cleanedBody,
              };
            } else {
              result.fields[name] = cleanedBody.toString().trim();
            }
          }
        }

        resolve(result);
      } catch (err) {
        reject(err);
      }
    });

    req.on("error", (err) => reject(err));
  });
};
