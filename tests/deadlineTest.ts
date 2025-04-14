import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Rustfund } from "../target/types/rustfund";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram, Message } from "@solana/web3.js";
import { expect } from "chai";

describe("Deadline Test", () => {

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.Rustfund as Program<Rustfund>;
    const creator = provider.wallet;

    const contributor = Keypair.generate();
    const other = Keypair.generate();

    const goal = new anchor.BN(1000000000); // 1 SOL
    const smallContribution = new anchor.BN(500000000); // 0.5 SOL

    let fund: anchor.IdlAccounts<Rustfund>["fund"];
    let contribution: anchor.IdlAccounts<Rustfund>["contribution"];

    let fundPDA: PublicKey;
    let fundBump: number;

    let contributionPDA: PublicKey;
    let contributionBump: number;

    let contributorInitialBalance: number;
    let creatorInitialBalance: number;
    let otherInitialBalance: number;
    let fundInitialBalance: number;
    let fundBalance: number
    let fundActualBalance: number;

    let deadline: anchor.BN;
    let name: string;
    let description: string;


    before( async () => {

        const airdropSignature = await provider.connection.requestAirdrop(contributor.publicKey, 5 * LAMPORTS_PER_SOL);
        const otherAirdropSignature = await provider.connection.requestAirdrop(other.publicKey, 1 * LAMPORTS_PER_SOL);

        /**
         * Confirm the tx using the new `TransactionConfirmationStrategy` in `@solana/web3.js`
         * See `node_modules/@solana/web3.js/lib/index.d.ts` at line 3308
         * To open the file directly in VS Code, run command below and look for line 3308: 
         * `code node_modules/@solana/web3.js/lib/index.d.ts`
         */
        await provider.connection.confirmTransaction({
            signature: airdropSignature,
            blockhash: (await provider.connection.getLatestBlockhash()).blockhash,
            lastValidBlockHeight: (await provider.connection.getLatestBlockhash()).lastValidBlockHeight,
        });

        await provider.connection.confirmTransaction({
            signature: otherAirdropSignature,
            blockhash: (await provider.connection.getLatestBlockhash()).blockhash,
            lastValidBlockHeight: (await provider.connection.getLatestBlockhash()).lastValidBlockHeight,
        });

        // Fetch contributor and creator balances prior to creating the fund
        contributorInitialBalance = await provider.connection.getBalance(contributor.publicKey);
        creatorInitialBalance = await provider.connection.getBalance(creator.publicKey);
        otherInitialBalance = await provider.connection.getBalance(other.publicKey);

        console.log(` 💰 Contributor Address ${contributor.publicKey} with Initial Balance: ${contributorInitialBalance / LAMPORTS_PER_SOL} SOL`);
        console.log(` 💰 Creator Address ${creator.publicKey} with Initial Balance: ${creatorInitialBalance / LAMPORTS_PER_SOL} SOL`);
        console.log(` 💰 Other Address ${other.publicKey} with Initial Balance: ${otherInitialBalance / LAMPORTS_PER_SOL} SOL`);
    })

    describe("1- TEST SET DEADLINE FUNCTION", () => {

        before(async () => {

            name = "Regular Test"
            description = "Test When Deadline is Set"
            deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 10); // 10 secs from now

            [fundPDA, fundBump] = PublicKey.findProgramAddressSync(
                [Buffer.from(name), creator.publicKey.toBuffer()], 
                program.programId
            );
            console.log(`Fund PDA Is ${fundPDA.toBase58()}`);

            await program.methods
                .fundCreate(name, description, goal)
                .accounts({
                    fund: fundPDA,
                    creator: creator.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            fund = await program.account.fund.fetch(fundPDA);
            fundInitialBalance = await provider.connection.getBalance(fundPDA)
            console.log(
                `Fund Initial Balance Is ${fundInitialBalance / LAMPORTS_PER_SOL} SOL`
            )

            await program.methods
                .setDeadline(deadline)
                .accounts({
                    fund: fundPDA,
                    creator: creator.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            fund = await program.account.fund.fetch(fundPDA);
        })

        it("1.1- `deadline` in Fund Struct Matches Actual Deadline", async () => {

            if((fund.deadline).eq(deadline)) {
                console.log(` ✅ Deadline Reflects the Real Deadline As Expected`);
            } else {
                console.error(
                    ` ❌ Deadline Is Not Set Properly Unexpectedly: 
                    - Actual Deadline is ${deadline} Versus Deadline in Fund Struct: ${fund.deadline}!!`
                );
                console.log(` 🚨 EXPLOIT: SET DEADLINE FUNCTION DOES NOT REFLECT ACTUAL DEADLINE`);
            }
        })

        it("1.2- Boolean `deadline_set` in Fund Struct isn't Flagged Correctly", async () => {

            if(fund.dealineSet === true) {
                console.log(` ✅ Fund Deadline Set Correctly Updated the State To True`);
            } else {
                console.error(` ❌ Fund Deadline Set Did Not Update the State & Still False as Expected!!`);
                console.error(` 🚨 EXPLOIT CONFIRMED: SET DEADLINE FUNCTION DOES NOT PROPERLY UPDATE DEADLINE_SET FLAG`);
            }                
        })

        it("1.3- Creator Address in Fund Struct Matches Actual Creator Address", async () => {

            if(expect(fund.creator.toBase58()).to.equal(creator.publicKey.toBase58())) {
                console.log(` ✅ Fund Creator Reflects the Real Creator as Expected`);
            } else {
                console.error(` ❌ Fund Creator Is Not Set Correctly:
                   - Actual Creator is ${creator.publicKey} Versus Creator in Fund Struct: ${fund.creator}!!`
                );
                console.error(` 🚨 EXPLOIT: CREATE FUND FUNCTION DOES NOT REFLECT ACTUAL CREATOR ADDRESS OF CREATOR IN FUND STRUCT`);
            }                
        })

        it("1.4- `set_deadline` Function Enforces Access Control", async () => {

            const newDeadline = new anchor.BN(Math.floor(Date.now() / 1000) + 30); // 30 secs from now

            try {
                await program.methods
                    .setDeadline(newDeadline)
                    .accounts({
                        fund: fundPDA,
                        Contributor: contributor.publicKey,
                        systemProgram: SystemProgram.programId
                    })
                    .signers([contributor])
                    .rpc()

                console.error(`❌ Deadline Modified by Unauthorized Contributor Unexpectedly!!!`)

                fund = await program.account.fund.fetch(fundPDA);

                if(fund.deadline.eq(deadline)) {
                    console.error(`🚨 EXPLOIT: SET DEADLINE FUNCTION CAN BE INVOKED BY UNAUTHORIZED CONTRIBUTOR`)
                    console.log(`Initial Deadline Was: ${deadline}`)
                    console.log(`New Deadline Is: ${fund.deadline}`)
                }

            } catch (error) {
                const errorMessage = error.error?.errorMessage || error.message;
                console.error(` ✅ Modifying Deadline Failed with Error Message: ${errorMessage}`)

                fund = await program.account.fund.fetch(fundPDA);
                fund.deadline.lt(newDeadline)
            }       
        })


        describe("2- TEST ALL FUNCTIONS BEFORE DEADLINE IS REACHED", () => {

            before( async () => {

                [contributionPDA, contributionBump] = PublicKey.findProgramAddressSync(
                    [fundPDA.toBuffer(), contributor.publicKey.toBuffer()],
                    program.programId
                );

                await program.methods
                .contribute(smallContribution)
                .accounts({
                    fund: fundPDA,
                    contributor: contributor.publicKey,
                    contribution: contributionPDA,
                    systemProgram: SystemProgram.programId,
                })
                .signers([contributor])
                .rpc();
            
                fund = await program.account.fund.fetch(fundPDA);
                contribution = await program.account.contribution.fetch(contributionPDA);
                fundBalance = await provider.connection.getBalance(fundPDA)

                if(fundInitialBalance !== 0) {
                    fundActualBalance = fundBalance - fundInitialBalance;
                    console.log("ALWAYS DEDUCT FUND INITIAL BALANCE FROM FUND BALANCE");
                    console.log(`Fund Initial Balance Before Any Contribution: ${fundInitialBalance / LAMPORTS_PER_SOL} SOL`);
                    console.log(`Fund Total Balance After First Contribution: ${fundBalance / LAMPORTS_PER_SOL} SOL`);
                    console.log(`Fund Actual Balance: ${fundActualBalance / LAMPORTS_PER_SOL} SOL`);
                } else {
                    console.log("NEVER DEDUCT FUND INITIAL BALANCE FROM FUND BALANCE");
                    console.log(`Fund Balance After First Contribution: ${fundBalance / LAMPORTS_PER_SOL} SOL`);
                }
            })

            it("2.1- `amount_raised` in Fund Struct Mismatches `amount` in Contribution Struct", async () => {

                if((fund.amountRaised).eq(contribution.amount)) {
                    console.log(` ✅ Amount Raised Matches Contribution Amount Unexpectedly`);
                } else {
                    console.error(` ❌ Amount Raised Does Not Match Contribution Amount:
                        Amount Raised is ${fund.amountRaised.toNumber() / LAMPORTS_PER_SOL} SOL
                        Versus Contribution Amount: ${contribution.amount.toNumber() / LAMPORTS_PER_SOL} SOL!!`
                    );
                    console.error(` 🚨 EXPLOIT CONFIRMED: CONTRIBUTE FUNCTION DOES NOT UPDATE AMOUNT IN CONTRIBUTION STRUCT`);
                }
            })

            it("2.2- `amount_raised` in Fund Struct Matches Actual Contribution", async () => {

                if((fund.amountRaised).eq(smallContribution)) {
                    console.log(` ✅ Amount Raised Matches Actual Contribution as Expected`);
                } else {
                    console.error(` ❌ Amount Raised Does Not Match Actual Contribution:
                        Amount Raised is ${fund.amountRaised.toNumber() / LAMPORTS_PER_SOL} SOL
                        Versus Actual Contribution: ${smallContribution.toNumber() / LAMPORTS_PER_SOL} SOL!!`
                    );
                    console.error(` 🚨 EXPLOIT: CONTRIBUTE FUNCTION DOES NOT UPDATE AMOUNT RAISED IN FUND STRUCT`);
                }
            })

            it("2.3- `amount_raised` in Fund Struct Matches Fund Balance", async () => {

                if (fund.amountRaised.toNumber() === fundActualBalance) {
                    console.log(` ✅ Fund Balance Matches Amount Raised as Expected`);
                } else {
                    console.error(` ❌ Fund Balance Does Not Match Amount Raised:
                        Fund Actual Balance is ${fundActualBalance / LAMPORTS_PER_SOL} SOL 
                        Versus Amount Raised: ${fund.amountRaised.toNumber() / LAMPORTS_PER_SOL} SOL!!`
                    );
                    console.error(`🚨 EXPLOIT: CONTRIBUTE FUNCTION DOES NOT UPDATE AMOUNT RAISED IN FUND STRUCT`);
                }
            })

            it("2.4- `amount` in Contribution Struct Mismatches Actual Contribution", async () => {

                if((contribution.amount).eq(smallContribution)) {
                    console.log(` ✅ Contribution Amount Matches Actual Contribution Unexpectedly`);
                } else {
                    console.error(` ❌ Contribution Amount Does Not Match Actual Contribution:
                        Contribution Amount is ${contribution.amount.toNumber() / LAMPORTS_PER_SOL} SOL
                        Versus Actual Contribution: ${smallContribution.toNumber() / LAMPORTS_PER_SOL} SOL!!`
                    );
                    console.error(`🚨 EXPLOIT CONFIRMED: CONTRIBUTE FUNCTION DOES NOT UPDATE AMOUNT IN CONTRIBUTION STRUCT`);
                }
            })

            it("2.5- `amount` in Contribution Struct Mismatches Fund Balance", async () => {

                if(contribution.amount.toNumber() === fundActualBalance) {
                    console.log(` ✅ Contribution Amount Matches Fund Balance as Expected`);
                } else {
                    console.error(` ❌ Contribution Amount Does Not Match Fund Balance:
                        Contribution Amount is ${contribution.amount.toNumber() / LAMPORTS_PER_SOL} SOL
                        Versus Fund Actual Balance: ${fundActualBalance / LAMPORTS_PER_SOL} SOL!!`
                    );
                    console.error(`🚨 EXPLOIT CONFIRMED: CONTRIBUTE FUNCTION DOES NOT UPDATE AMOUNT IN CONTRIBUTION STRUCT`);
                }                
            })

            it("2.6- Contributor Address in Contribution Struct Matches Actual Contributor Address", async () => {

                if(expect(contribution.contributor.toBase58()).to.equal(contributor.publicKey.toBase58())) {
                    console.log(` ✅ Fund Contributor Matches Actual Contributor`);
                } else {
                    console.error(` ❌ Fund Contributor Does Not Match Actual Contributor:
                        Fund Contributor is ${contribution.contributor} 
                        Versus Actual Contributor: ${contributor.publicKey}!!`
                    );
                    console.error(` 🚨 EXPLOIT: CONTRIBUTE FUNCTION DOES NOT REFLECT CONTRIBUTOR ADDRESS IN CONTRIBUTION STRUCT`);
                }
            })

            it("2.7- Contributions Are Accepted Before Deadline is Reached", async () => {
                
                const secondContribution = new anchor.BN(500000000);
    
                try {
                    await program.methods
                    .contribute(secondContribution)
                    .accounts({
                        fund: fundPDA,
                        contribution: contributionPDA,
                        contributor: contributor.publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([contributor])
                    .rpc();
    
                    console.log(` ✅ Contribution Is Accepted as Expected`)

                    fund = await program.account.fund.fetch(fundPDA)
                    contribution = await program.account.contribution.fetch(contributionPDA)
                    const totalContributions = smallContribution.add(secondContribution);
                    fundBalance = await provider.connection.getBalance(fundPDA);
                    fundActualBalance = fundBalance - fundInitialBalance;

                    (fund.amountRaised).eq(totalContributions);
                    contribution.amount.eq(new anchor.BN(0));
                    expect(fund.amountRaised.toNumber()).to.equal(fundActualBalance);
                    expect(totalContributions.toNumber()).to.equal(fundActualBalance);

                } catch (error) {
                    const errorMessage = error.error?.errorMessage || error.message; 
                    console.error(` ❌ Contribution Failed Unexpectedly Because Of Error: ${errorMessage}`);
                }
            });

            it("2.8- Refund Reverts Before Deadline Is Not Reached", async () => {

                const contributorBalanceBeforeRefund = await provider.connection.getBalance(contributor.publicKey);

                try {
                    await program.methods
                        .refund()
                        .accounts({
                            fund: fundPDA,
                            contribution: contributionPDA,
                            contributor: contributor.publicKey,
                            systemProgram: SystemProgram.programId,
                        })
                        .signers([contributor])
                        .rpc();

                    console.error(` ❌ Refund Succeeded Unexpectedly !!!!`);

                    fund = await program.account.fund.fetch(fundPDA);
                    contribution = await program.account.contribution.fetch(contributionPDA);
                    const contributorBalanceAfterRefund = await provider.connection.getBalance(contributor.publicKey);

                    if(contributorBalanceAfterRefund > contributorBalanceBeforeRefund) {
                        console.error(` 🚨 EXPLOIT: Contributor Gets Refund When Deadline Is Not Reached!`);
                        console.log(`Contributor Balance Before Refund Is: ${contributorBalanceBeforeRefund / LAMPORTS_PER_SOL} SOL`);
                        console.log(`Contributor Balance After Refund Is: ${contributorBalanceAfterRefund / LAMPORTS_PER_SOL} SOL`);
                    }
                } catch (error) {
                    const errorMessage = error.error?.errorMessage || error.message;
                    expect(errorMessage).to.include("Deadline not reached");
                    console.error(` ✅ Refund Failed as Expected with Error: ${errorMessage}`);
                }
            });

            it("2.9- Withdraw Function Does Not Validate If Deadline Is Reached", async () => {

                // Fetch fund prior to withdrawal
                fund = await program.account.fund.fetch(fundPDA);
                const amountRaisedBeforeWithdrawal = fund.amountRaised;
                const fundBalanceBeforeWithdrawal = await provider.connection.getBalance(fundPDA);
                const creatorBalanceBeforeWithdrawal = await provider.connection.getBalance(creator.publicKey);

                fund.deadline.eq(deadline)

                try {
                    await program.methods   
                        .withdraw()
                        .accounts({
                            fund: fundPDA,
                            creator: creator.publicKey,
                            systemProgram: SystemProgram.programId
                        })
                        .rpc()

                    console.log(` ✅ Creator Withdraw Funds Before Deadline As Expected`)

                    fund = await program.account.fund.fetch(fundPDA);
                    const fundBalanceAfterWithdrawal = await provider.connection.getBalance(fundPDA);
                    const creatorBalanceAfterWithdrawal = await provider.connection.getBalance(creator.publicKey);

                    if(fundBalanceAfterWithdrawal !== fundInitialBalance) {
                        console.error(` 🚨 EXPLOIT: Fund Balance Was Not Decremented By Withdrawn Amount`)
                        console.log(`Fund Balance Before Withdrawal: ${fundBalanceBeforeWithdrawal / LAMPORTS_PER_SOL} SOL`);
                        console.log(`Fund Balance After Withdrawal: ${fundBalanceAfterWithdrawal / LAMPORTS_PER_SOL} SOL`);
                        console.log(`Fund Initial Balance: ${fundInitialBalance / LAMPORTS_PER_SOL} SOL`);
                    }

                    if(creatorBalanceBeforeWithdrawal + amountRaisedBeforeWithdrawal.toNumber() <= creatorBalanceAfterWithdrawal) {
                        console.error(` 🚨 EXPLOIT: Creator Balance Discrepancy`)
                        console.log(`Creator Balance Before Withdrawal: ${creatorBalanceBeforeWithdrawal / LAMPORTS_PER_SOL} SOL`);
                        console.log(`Creator Balance After Withdrawal: ${creatorBalanceAfterWithdrawal / LAMPORTS_PER_SOL} SOL`);
                    }
                } catch(err) {
                    const errorMessage = err.error?.errorMessage || err.message
                    console.error(` ❌ withdrawal Failed Unexpectedly With Error Message: ${errorMessage}`)  
                }
            })

        })

        describe("3- TEST ALL FUNCTIONS AFTER DEADLINE IS REACHED", () => { 

            before(async () => {

                [contributionPDA, contributionBump] = PublicKey.findProgramAddressSync(
                    [fundPDA.toBuffer(), contributor.publicKey.toBuffer()],
                    program.programId
                );

                await program.methods
                .contribute(goal)
                .accounts({
                    fund: fundPDA,
                    contributor: contributor.publicKey,
                    contribution: contributionPDA,
                    systemProgram: SystemProgram.programId,
                })
                .signers([contributor])
                .rpc();
            
                fund = await program.account.fund.fetch(fundPDA);
                contribution = await program.account.contribution.fetch(contributionPDA);
                fundBalance = await provider.connection.getBalance(fundPDA)

                if(fundInitialBalance !== 0) {
                    fundActualBalance = fundBalance - fundInitialBalance;
                    console.log("ALWAYS DEDUCT FUND INITIAL BALANCE FROM FUND BALANCE");
                    console.log(`Fund Initial Balance Before Any Contribution: ${fundInitialBalance / LAMPORTS_PER_SOL} SOL`);
                    console.log(`Fund Total Balance After First Contribution: ${fundBalance / LAMPORTS_PER_SOL} SOL`);
                    console.log(`Fund Actual Balance: ${fundActualBalance / LAMPORTS_PER_SOL} SOL`);
                } else {
                    console.log("NEVER DEDUCT FUND INITIAL BALANCE FROM FUND BALANCE");
                    console.log(`Fund Balance After First Contribution: ${fundBalance / LAMPORTS_PER_SOL} SOL`);
                }

                console.log("\n⏳ WAITING FOR 10 SECS DEADLINE TO PASS.............");
                await new Promise((resolve) => setTimeout(resolve, 10 * 1000));
            })

            it("3.1- Contributions Should Revert After Deadline", async () => {

                try {
                    await program.methods   
                        .contribute(goal)
                        .accounts({
                            fund: fundPDA,
                            contribution: contributionPDA,
                            contributor: contributor.publicKey,
                            systemProgram: SystemProgram.programId
                        })
                        .signers([contributor])
                        .rpc()

                    console.error(` ❌ Contribution Went Through Unexpectedly After Deadline !!!!!!!`)
                } catch(err) {
                    const errorMessage = err.error?.errorMessage || err.message
                    expect(errorMessage).to.include("Deadline reached")
                    console.error(` ✅ Contribution Reverted as Expected With Error Message: ${errorMessage}`)  

                    fund = await program.account.fund.fetch(fundPDA)
                    const fundActualBalanceAfter = await provider.connection.getBalance(fundPDA) - fundInitialBalance;
                    expect(fundActualBalanceAfter).to.equal(fundActualBalance)
                }
            })

            it("3.2- Refund Will Go Through After Deadline", async () => {

                fund = await program.account.fund.fetch(fundPDA)
                const fundBalanceBeforeRefund = await provider.connection.getBalance(fundPDA) - fundInitialBalance;
                const timeNow = new anchor.BN(Math.floor(Date.now() / 1000));
                if(fund.deadline >= timeNow) {
                    console.log(` ❌ Deadline Hasn't passed yet!`);
                }

                try {
                    await program.methods
                        .refund()
                        .accounts({
                            fund: fundPDA,
                            contribution: contributionPDA,
                            contributor: contributor.publicKey,
                            systemProgram: SystemProgram.programId,
                        })
                        .signers([contributor])
                        .rpc();

                    console.log(` ✅ Refund Went Through As Expected`)

                    fund = await program.account.fund.fetch(fundPDA);
                    const fundBalanceAfterRefund = await provider.connection.getBalance(fundPDA) - fundInitialBalance;
                    console.log(`Fund Balance Before Refund: ${fundBalanceBeforeRefund / LAMPORTS_PER_SOL} SOL`)
                    console.log(`Fund Balance After Refund: ${fundBalanceAfterRefund / LAMPORTS_PER_SOL} SOL`)
                    console.log(`Fund Initial Balance Before Any Contribution: ${fundInitialBalance / LAMPORTS_PER_SOL} SOL`);
                } catch(err) {
                    const errorMessage = err.error?.errorMessage || err.message
                    console.error(` ❌ Refund Failed with Error Message: ${errorMessage}`)
                    console.error(` 🚨 EXPLOIT: Refund Function Failed Unexpectedly!!!!!!!`);
                }
            })
           
        })
    })



    describe("4- TEST WHEN DEADLINE IS ZERO OR UNSET", () => {

        before(async () => {

            name = "No Deadline",
            description = "Test Missing To Set Deadline",
            
            [fundPDA, fundBump] = PublicKey.findProgramAddressSync(
                [Buffer.from(name), creator.publicKey.toBuffer()],
                program.programId
            )
            console.log(`Fund PDA Address is: ${fundPDA.toBase58()}`)

            await program.methods
                .fundCreate(name, description, goal)
                .accounts({
                    fund: fundPDA,
                    creator: creator.publicKey,
                    systemProgram: SystemProgram.programId
                })
                .rpc()
            
            fund = await program.account.fund.fetch(fundPDA);
            fundInitialBalance = await provider.connection.getBalance(fundPDA);
            console.log(`Fund Initial Balance is: ${fundInitialBalance / LAMPORTS_PER_SOL} SOL`);

            [contributionPDA, contributionBump] = PublicKey.findProgramAddressSync(
                [fundPDA.toBuffer(), contributor.publicKey.toBuffer()],
                program.programId
            )

            await program.methods
                .contribute(goal)
                .accounts({
                    fund: fundPDA,
                    contributor: contributor.publicKey,
                    contribution: contributionPDA,
                    systemProgram: SystemProgram.programId,
                })
                .signers([contributor])
                .rpc();
            
            fund = await program.account.fund.fetch(fundPDA);
            contribution = await program.account.contribution.fetch(contributionPDA);
            fundActualBalance = await provider.connection.getBalance(fundPDA) - fundInitialBalance;
            console.log(`Fund Actual Balance After Contribution: ${fundActualBalance / LAMPORTS_PER_SOL} SOL`);
        })

        it("4.1- Will Fund Accept Contributions when Deadline Is Zero", async () => {

            if(fund.deadline.toNumber() === 0 && fund.amountRaised.toNumber() === fundActualBalance) {
                console.error(` ❌ Contribute Function Accepts Contributions When Deadline: ${fund.deadline}`);
                console.log(` 🚨 EXPLOIT: Fund Accepts Contributions Because Deadline Is Zero!`);
            } else {
                console.log(` ✅ Fund Does Not Accept Contributions Even Deadline Is Zero!`);
            }
        });

        it("4.2- Will Contributor Get Refund When Deadline Is Zero", async () => {

            fund = await program.account.fund.fetch(fundPDA);
            console.log(`Fund deadline is ${fund.deadline}`)
            const contributorBalanceBeforeRefund = await provider.connection.getBalance(contributor.publicKey);
            const fundBalanceBeforeRefund = await provider.connection.getBalance(fundPDA);
       
            
            try {
                await program.methods
                    .refund()
                    .accounts({
                        fund: fundPDA,
                        contributor: contributor.publicKey,
                        contribution: contributionPDA,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([contributor])
                    .rpc();
                console.error(` ❌ Contributor Refund Went Through!!!!`);
                console.log(` 🚨 EXPLOIT: Contributor Gets Refund When Deadline Is Zero!`);

            } catch (error) {
                const errorMessage = error.error?.errorMessage || error.message;
                console.error(` ✅ Contributor Refund Failed With Error: ${errorMessage}`);
            }

            fund = await program.account.fund.fetch(fundPDA);
            fund.amountRaised.eq(new anchor.BN(0));

            const fundBalanceAfterRefund = await provider.connection.getBalance(fundPDA);

            console.log(`Fund Balance Before Refund: ${fundBalanceBeforeRefund / LAMPORTS_PER_SOL} SOL`)
            console.log(`Fund Balance After Refund: ${fundBalanceAfterRefund / LAMPORTS_PER_SOL} SOL`)
            

            const contributorBalanceAfterRefund = await provider.connection.getBalance(contributor.publicKey);
            console.log(`Contributor Balance Before Refund: ${contributorBalanceBeforeRefund / LAMPORTS_PER_SOL} SOL`)
            console.log(`Contributor Balance After Refund: ${contributorBalanceAfterRefund / LAMPORTS_PER_SOL} SOL`)
        })

    })
})




