import { useEffect } from "react";
import { useConnect, useAccount } from "wagmi";
import { injected } from "wagmi/connectors";
import { checkMiniPay } from "../config/wagmi";

interface MiniPayDetectorProps {
  children: React.ReactNode;
  connectButton: React.ReactNode;
}

export function MiniPayDetector({ children, connectButton }: MiniPayDetectorProps) {
  const { connect } = useConnect();
  const { isConnected } = useAccount();
  const isMiniPay = checkMiniPay();

  useEffect(() => {
    if (isMiniPay && !isConnected) {
      connect({ connector: injected() });
    }
  }, [isMiniPay, isConnected, connect]);

  if (isMiniPay) return <>{children}</>;

  return (
    <>
      {!isConnected && connectButton}
      {isConnected && children}
    </>
  );
}
