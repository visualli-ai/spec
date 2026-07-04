import { MySDKCore } from "@mysdk/core";

export function useMySdk() {
  const sdk = new MySDKCore();
  
  return {
    status: sdk.getStatus(),
    isReady: true
  };
}