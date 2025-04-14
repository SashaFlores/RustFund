## Commands to Start Fresh and Run localNet


- Removes Anchor-specific cached data (e.g., .anchor directory).

    `anchor clean`

- Removes Rust build artifacts (compiled binaries in the target directory)

    `cargo clean`

- Start a Persistent Test Validator in a Separate Terminal:

    `solana-test-validator --ledger .ledger`

- Restart the validator with reduced resource usage:

    `solana-test-validator --reset --limit-ledger-size`

using `--ledger .ledger` flag saves the blockchain state across sessions

- Generate a new keypair:

    `solana-keygen new --outfile target/deploy/rustfund-keypair.json`

- Get the program ID:


    `solana address -k target/deploy/rustfund-keypair.json`

- copy and paste the new program id in rust macro and anchor file

    "6xiFsppNeMEA3eyJSbGzTG8v7r9w8euD4xsth7pPJS7h"

- Update Solana CLI to Use Localhost
Ensure the Solana CLI is configured to use the local test validator:



`solana config set --url localhost`

- Compile the Program

    `anchor build`

- Deploy the Program to the local test validator

    `anchor deploy`

- Run your Test, use `--skip-deploy` to aviod redeploying the program

    `anchor test --skip-deploy`


# `anchor test --skip-build`

**What It Does:**

* Skips the build step (compilation of the program).

* Assumes the program is already compiled and uses the existing build artifacts in the target directory.

* Still deploys the program to the cluster (localnet, devnet, or mainnet) before running the tests.

**When to Use:**

* When you have already built the program and want to save time by skipping the compilation step.
* Useful for quick iterations when the program code hasn't changed.


**Behavior Across Clusters:**

* Localnet: Deploys the program to the local test validator and runs the tests.
* Devnet/Mainnet: Deploys the program to the specified cluster (devnet or mainnet) and runs the tests.

# `anchor test --skip-deploy`

**What It Does:**

* Skips the deployment step.
* Assumes the program is already deployed to the cluster (localnet, devnet, or mainnet).
* Runs the tests against the existing deployed program.


**When to Use:**

* When the program is already deployed and you want to test against the existing deployment without redeploying.
* Useful for preserving the program ID and associated accounts (e.g., PDAs) across multiple test runs.


**Behavior Across Clusters:**

* Localnet: Runs the tests against the program already deployed to the local test validator.
* Devnet/Mainnet: Runs the tests against the program already deployed to the specified cluster (devnet or mainnet).

### Examples

**Localnet**

* `anchor test --skip-build`:

    - Skips building the program.

    - Deploys the program to the local test validator.

    - Runs the tests.

* `anchor test --skip-deploy`:

    - Builds the program (if needed).

    - Skips deploying the program.

    - Runs the tests against the program already deployed to the local test validator.

**Devnet/Mainnet**

* `anchor test --skip-build`:

    - Skips building the program.

    - Deploys the program to devnet or mainnet.
    - Runs the tests.

* `anchor test --skip-deploy`:

    - Builds the program (if needed).

    - Skips deploying the program.

    - Runs the tests against the program already deployed to devnet or mainnet.

### When to Use Each Command:

Use `--skip-build`:

When you want to redeploy the program but skip the build step to save time.

*Example: Testing changes to deployment configurations or accounts without modifying the program code.*

Use `--skip-deploy`:

When you want to test against an existing deployment without redeploying the program.

*Example: Testing program behavior with pre-existing accounts or PDAs.*

### Summary

**`--skip-build`:** Skips building the program but still deploys it before running tests.

**`--skip-deploy`:** Skips deploying the program and runs tests against the existing deployment.

> Use the appropriate flag based on whether you need to redeploy the program or not.


