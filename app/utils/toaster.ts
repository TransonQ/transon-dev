// https://shopify.dev/docs/api/app-bridge-library/reference/toast
export const toaster = {
  success: (message: string) => {
    window.shopify.toast.show(message);
  },
  error: (message: string) => {
    window.shopify.toast.show(message, { isError: true });
  },
};
