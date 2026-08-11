import { useState } from 'react';
import { FilePicker } from 'react-os-shell';

// FilePicker — chooses files and lists them. It does NOT upload: the form
// submits the File[] however it already submits everything else.

export function Attachments() {
  const [files, setFiles] = useState<File[]>([]);
  return (
    <div className="max-w-md p-5">
      <FilePicker
        files={files}
        onChange={setFiles}
        label="Attachments"
        hint="Up to 10 files, 25 MB each."
        maxFiles={10}
        maxSizeBytes={25 * 1024 * 1024}
      />
    </div>
  );
}
