export const parseCSV = (csv: string) => {
  const lines = csv.split('\n');
  const headers = lines[0].split(';');
  
  return lines.slice(1).filter(line => line.trim()).map(line => {
    const values = line.split(';');
    const obj: any = {};
    headers.forEach((header, i) => {
      obj[header.trim()] = values[i]?.trim();
    });
    return obj;
  });
};
