type Target = { projectId: string; taskId?: string; requestId?: string; messageId?: string; clientVisible?: boolean };

/** Private uploads use small authenticated requests, including chat attachments. */
export async function uploadPrivateFile(file: File, target: Target) {
  const call = async (url: string, init: RequestInit) => {
    const response = await fetch(url, init);
    const json = await response.json();
    if (!response.ok || !json.ok) throw new Error(json.error ?? "Upload failed.");
    return json;
  };
  const { id, chunkBytes } = await call("/api/upload/chunks", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: file.name, mime: file.type, size: file.size, target }),
  });
  for (let offset = 0, part = 0; offset < file.size; offset += chunkBytes, part++) {
    await call(`/api/upload/chunks?id=${id}&part=${part}`, { method: "PUT", body: file.slice(offset, offset + chunkBytes) });
  }
  return (await call(`/api/upload/chunks?id=${id}&finish=1`, { method: "POST" })).file as { id: string; name: string; mime: string; size: number };
}
