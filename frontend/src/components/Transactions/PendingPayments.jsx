import { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  AGENT_VAULT_ABI,
  AGENT_VAULT_ADDRESS,
  MST_TESTNET_CHAIN_ID,
  MST_TESTNET_RPC,
} from "../../contracts/agentVault";

const PAYMENT_STATUS = {
  ALLOWED: 0,
  BLOCKED: 1,
  PENDING: 2,
};

function getReadOnlyContract() {
  const provider = new ethers.JsonRpcProvider(MST_TESTNET_RPC);

  return new ethers.Contract(
    AGENT_VAULT_ADDRESS,
    AGENT_VAULT_ABI,
    provider
  );
}

function shortenAddress(address) {
  if (!address) return "-";

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatAmount(amount) {
  try {
    return `${ethers.formatEther(amount)} MST`;
  } catch {
    return `${amount} MST`;
  }
}

export default function PendingPayments() {
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState("");

  async function loadPendingPayments() {
    try {
      setLoading(true);

      const provider = new ethers.JsonRpcProvider(
        MST_TESTNET_RPC
      );

      const vault = getReadOnlyContract();

      const nextPaymentId =
        await vault.nextPaymentId();

      const paymentCount = Number(nextPaymentId);

      const payments = [];

      for (let id = 0; id < paymentCount; id++) {
        const payment =
          await vault.getPayment(id);

        const recipient = payment[0];
        const amount = payment[1];
        const receiptHash = payment[2];
        const status = Number(payment[3]);

        if (status === PAYMENT_STATUS.PENDING) {
          let blockTimestamp = null;

          try {
            const events =
              await vault.queryFilter(
                vault.filters.Pending(id),
                0,
                "latest"
              );

            if (events.length > 0) {
              const latestEvent =
                events[events.length - 1];

              const block =
                await provider.getBlock(
                  latestEvent.blockNumber
                );

              blockTimestamp =
                block?.timestamp ?? null;
            }
          } catch (eventError) {
            console.error(
              "Could not read pending event:",
              eventError
            );
          }

          payments.push({
            id,
            recipient,
            amount,
            receiptHash,
            status,
            timestamp: blockTimestamp,
          });
        }
      }

      setPendingPayments(payments);
    } catch (error) {
      console.error(
        "Failed to load pending payments:",
        error
      );

      setMessage(
        "Could not load pending payments from AgentVault."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPendingPayments();

    const interval = setInterval(
      loadPendingPayments,
      15000
    );

    return () => clearInterval(interval);
  }, []);

  async function getOwnerContract() {
    if (!window.ethereum) {
      throw new Error(
        "BridgeKey wallet not detected."
      );
    }

    if (!window.ethereum.isBridgeKey) {
      throw new Error("Please use BridgeKey.");
    }

    const chainId =
      await window.ethereum.request({
        method: "eth_chainId",
      });

    const numericChainId =
      parseInt(chainId, 16);

    if (
      numericChainId !== MST_TESTNET_CHAIN_ID
    ) {
      throw new Error(
        "Please switch BridgeKey to MST Testnet."
      );
    }

    const accounts =
      await window.ethereum.request({
        method: "eth_requestAccounts",
      });

    if (!accounts.length) {
      throw new Error(
        "Please connect BridgeKey."
      );
    }

    const provider =
      new ethers.BrowserProvider(
        window.ethereum
      );

    const signer =
      await provider.getSigner();

    const vault = new ethers.Contract(
      AGENT_VAULT_ADDRESS,
      AGENT_VAULT_ABI,
      signer
    );

    const owner = await vault.owner();

    if (
      owner.toLowerCase() !==
      accounts[0].toLowerCase()
    ) {
      throw new Error(
        "Connected wallet is not the vault owner."
      );
    }

    return vault;
  }

  async function approvePayment(id) {
    try {
      setProcessingId(id);
      setMessage(
        `Approving payment #${id}...`
      );

      const vault =
        await getOwnerContract();

      const tx =
        await vault.approvePayment(id);

      setMessage(
        `Waiting for approval transaction for payment #${id}...`
      );

      await tx.wait();

      setMessage(
        `Payment #${id} approved successfully.`
      );

      await loadPendingPayments();
    } catch (error) {
      console.error(
        "Failed to approve payment:",
        error
      );

      setMessage(
        error?.shortMessage ||
          error?.reason ||
          error?.message ||
          `Failed to approve payment #${id}.`
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function rejectPayment(id) {
    try {
      setProcessingId(id);
      setMessage(
        `Rejecting payment #${id}...`
      );

      const vault =
        await getOwnerContract();

      const tx =
        await vault.rejectPayment(id);

      setMessage(
        `Waiting for rejection transaction for payment #${id}...`
      );

      await tx.wait();

      setMessage(
        `Payment #${id} rejected successfully.`
      );

      await loadPendingPayments();
    } catch (error) {
      console.error(
        "Failed to reject payment:",
        error
      );

      setMessage(
        error?.shortMessage ||
          error?.reason ||
          error?.message ||
          `Failed to reject payment #${id}.`
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <section className="panel pending-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">
            ACTION REQUIRED
          </p>

          <h2>
            Pending Payments
          </h2>
        </div>

        <span className="status-badge pending">
          {pendingPayments.length}
        </span>
      </div>

      {loading ? (
        <p>
          Loading pending payments from
          AgentVault...
        </p>
      ) : pendingPayments.length === 0 ? (
        <div className="empty-state">
          <p>
            No pending payments.
          </p>

          <small>
            Pending payments will appear here when
            AgentVault requires owner approval.
          </small>
        </div>
      ) : (
        <div className="pending-list">
          {pendingPayments.map(
            (payment) => (
              <div
                className="pending-payment"
                key={payment.id}
              >
                <div className="pending-details">
                  <div>
                    <span>
                      Payment ID
                    </span>

                    <strong>
                      #{payment.id}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Recipient
                    </span>

                    <strong
                      title={
                        payment.recipient
                      }
                    >
                      {shortenAddress(
                        payment.recipient
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Amount
                    </span>

                    <strong>
                      {formatAmount(
                        payment.amount
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Receipt Hash
                    </span>

                    <strong>
                      {shortenAddress(
                        payment.receiptHash
                      )}
                    </strong>
                  </div>
                </div>

                <div className="pending-actions">
                  <button
                    disabled={
                      processingId !== null
                    }
                    onClick={() =>
                      approvePayment(
                        payment.id
                      )
                    }
                  >
                    {processingId ===
                    payment.id
                      ? "Processing..."
                      : "Approve"}
                  </button>

                  <button
                    disabled={
                      processingId !== null
                    }
                    onClick={() =>
                      rejectPayment(
                        payment.id
                      )
                    }
                  >
                    Reject
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {message && (
        <div className="rules-message">
          {message}
        </div>
      )}
    </section>
  );
}