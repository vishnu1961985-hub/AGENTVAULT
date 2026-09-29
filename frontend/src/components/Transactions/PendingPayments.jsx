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
  if (!address) return "—";

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function shortenHash(hash) {
  if (!hash) return "—";

  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function formatAmount(amount) {
  try {
    return `${ethers.formatEther(amount)} MST`;
  } catch {
    return `${amount} MST`;
  }
}

export default function PendingPayments({ wallet }) {
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

      const paymentCount =
        Number(nextPaymentId);

      const payments = [];

      for (
        let id = 0;
        id < paymentCount;
        id++
      ) {
        const payment =
          await vault.getPayment(id);

        const recipient = payment[0];
        const amount = payment[1];
        const receiptHash = payment[2];
        const status = Number(payment[3]);

        if (
          status === PAYMENT_STATUS.PENDING
        ) {
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

    return () =>
      clearInterval(interval);
  }, []);

  async function getOwnerContract() {
    if (!window.ethereum) {
      throw new Error(
        "BridgeKey wallet not detected."
      );
    }

    if (!window.ethereum.isBridgeKey) {
      throw new Error(
        "Please use BridgeKey."
      );
    }

    const chainId =
      await window.ethereum.request({
        method: "eth_chainId",
      });

    const numericChainId =
      parseInt(chainId, 16);

    if (
      numericChainId !==
      MST_TESTNET_CHAIN_ID
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

    const owner =
      await vault.owner();

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
    <section className="approval-console">
      <div className="approval-console-header">
        <div>
          <div className="approval-kicker">
            <span className="approval-warning-dot" />
            HUMAN AUTHORITY REQUIRED
          </div>

          <h2>Approval Queue</h2>

          <p>
            Payments above the configured approval boundary
            wait here for owner authorization.
          </p>
        </div>

        <div className="approval-count">
          <strong>
            {pendingPayments.length}
          </strong>

          <span>
            PENDING
          </span>
        </div>
      </div>

      {loading ? (
        <div className="approval-empty">
          <div className="approval-loader">
            <span />
            <span />
            <span />
          </div>

          <strong>
            Scanning pending requests
          </strong>

          <span>
            Reading AgentVault state...
          </span>
        </div>
      ) : pendingPayments.length === 0 ? (
        <div className="approval-empty">
          <div className="approval-clear-icon">
            ✓
          </div>

          <strong>
            No intervention required
          </strong>

          <span>
            The approval queue is clear.
          </span>
        </div>
      ) : (
        <div className="approval-list">
          {pendingPayments.map(
            (payment) => (
              <article
                className="approval-request"
                key={payment.id}
              >
                <div className="approval-request-top">
                  <div className="approval-request-id">
                    <span>
                      PAYMENT REQUEST
                    </span>

                    <strong>
                      #{payment.id}
                    </strong>
                  </div>

                  <div className="approval-pending-badge">
                    ● PENDING
                  </div>
                </div>

                <div className="approval-request-main">
                  <div className="approval-amount">
                    <span>
                      REQUESTED
                    </span>

                    <strong>
                      {formatAmount(
                        payment.amount
                      )}
                    </strong>
                  </div>

                  <div className="approval-recipient">
                    <span>
                      RECIPIENT
                    </span>

                    <code
                      title={
                        payment.recipient
                      }
                    >
                      {shortenAddress(
                        payment.recipient
                      )}
                    </code>
                  </div>

                  <div className="approval-receipt">
                    <span>
                      ACTION RECEIPT
                    </span>

                    <code
                      title={
                        payment.receiptHash
                      }
                    >
                      {shortenHash(
                        payment.receiptHash
                      )}
                    </code>
                  </div>
                </div>

                <div className="approval-boundary">
                  <div className="boundary-line">
                    <span />
                  </div>

                  <div>
                    <small>
                      POLICY BOUNDARY
                    </small>

                    <strong>
                      OWNER DECISION REQUIRED
                    </strong>
                  </div>
                </div>

                <div className="approval-actions">
                  <button
                    className="approval-reject"
                    disabled={processingId !== null || !wallet?.isOwner || !wallet?.isCorrectNetwork}
                    onClick={() =>
                      rejectPayment(
                        payment.id
                      )
                    }
                  >
                    {processingId ===
                    payment.id
                      ? "PROCESSING..."
                      : "REJECT REQUEST"}
                  </button>

                  <button
                    className="approval-approve"
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
                      ? "PROCESSING..."
                      : "AUTHORIZE PAYMENT"}
                  </button>
                </div>
              </article>
            )
          )}
        </div>
      )}

      {message && (
        <div className="approval-message">
          <span>◆</span>
          {message}
        </div>
      )}
    </section>
  );
}