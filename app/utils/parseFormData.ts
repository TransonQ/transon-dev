export const parseFormData = (formData?: FormData) => {
  const obj: any = {};

  const emptyFormData = new FormData();
  const fmData = formData?.entries() || emptyFormData.entries();
  const entries = Array.from(fmData);

  for (let [key, value] of entries) {
    obj[key] = value;
  }

  return obj;
};
