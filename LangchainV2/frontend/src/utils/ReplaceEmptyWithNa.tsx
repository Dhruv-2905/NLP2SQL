interface DataObject {
  [key: string]: string | null | undefined;
}

export const ReplaceEmptyWithNA = <T extends DataObject | DataObject[] | null | undefined>(
  data: T
): T => {
  if (!data) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => {
      const modifiedItem = { ...item };
      for (const key in modifiedItem) {
        if (modifiedItem[key] === null || modifiedItem[key] === undefined) {
          modifiedItem[key] = "N/A";
        } else if (typeof modifiedItem[key] === "string") {
          modifiedItem[key] = modifiedItem[key].trim() === "" ? "N/A" : modifiedItem[key].trim();
        }
      }
      return modifiedItem;
    }) as T;
  }

  const modifiedItem = { ...data } as DataObject;
  for (const key in modifiedItem) {
    if (modifiedItem[key] === null || modifiedItem[key] === undefined) {
      modifiedItem[key] = "N/A";
    } else if (typeof modifiedItem[key] === "string") {
      modifiedItem[key] = modifiedItem[key].trim() === "" ? "N/A" : modifiedItem[key].trim();
    }
  }
  return modifiedItem as T;
};