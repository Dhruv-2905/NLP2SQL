export const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
};

export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }

    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    // const hours = date.getHours().toString().padStart(2, "0");
    // const minutes = date.getMinutes().toString().padStart(2, "0");
    // const seconds = date.getSeconds().toString().padStart(2, "0");

    // return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
};