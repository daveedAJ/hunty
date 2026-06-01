import { Keypair, Networks, Transaction, FeeBumpTransaction } from 'soroban-client';

/**
 * StellarPaymaster – utility for creating fee‑bump (gasless) transactions.
 * The paymaster signs the fee‑bump transaction, covering the fee for the user.
 *
 * Usage:
 * const paymaster = new StellarPaymaster('SC...'); // paymaster secret key
 * const feeBumpXdr = await paymaster.createFeeBump(userTxXdr);
 */
export class StellarPaymaster {
  private readonly paymasterKey: Keypair;
  private readonly network: string;

  /**
   * @param paymasterSecret The secret key of the paymaster account.
   * @param network Passphrase of the Stellar network (default TESTNET).
   */
  constructor(paymasterSecret: string, network: string = Networks.TESTNET) {
    this.paymasterKey = Keypair.fromSecret(paymasterSecret);
    this.network = network;
  }

  /**
   * Create a fee‑bump transaction that wraps a user‑signed transaction.
   * @param userTxXdr The XDR string of the user's unsigned/partially‑signed transaction.
   * @param maxFee Optional max fee (in stroops) the paymaster is willing to pay. Defaults to 100.
   * @returns The XDR string of the signed fee‑bump transaction.
   */
  async createFeeBump(userTxXdr: string, maxFee: number = 100): Promise<string> {
    // Parse the user's transaction using the network passphrase.
    const userTx = Transaction.fromXDR(userTxXdr, this.network);

    // Build a fee‑bump transaction that pays the fee on behalf of the user.
    const feeBumpTx = new FeeBumpTransaction(
      userTx,
      this.paymasterKey.publicKey(),
      { fee: maxFee, networkPassphrase: this.network }
    );

    // Sign the fee‑bump transaction with the paymaster's secret.
    feeBumpTx.sign(this.paymasterKey);

    // Return the encoded XDR.
    return feeBumpTx.toXDR();
  }
}
