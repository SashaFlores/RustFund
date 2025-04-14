# Findings Report Summary

### Number of findings:
   - High: 5
   - Medium: 2
   - Low: 5

### High Risk Findings
    
- H-01. No check for if campaign reached deadline before withdraw
    
- H-02. Creators Can Withdraw Funds Without Meeting Campaign Goals
    
- H-03. Permanent Loss of Contributor Funds: Missing Update to contribution.amount in the contribute() rustfund Contract
    
- H-04.  Inadequate Refund Conditions
    
- H-05. Circular Dependency in PDA Validation for FundWithdraw Instruction

### Medium Risk Findings

- M-01. Withdrawal doesn't reset amount_raised, leading to locked funds
    
- M-02. Fund Creator Can't Withdraw If Someone Has Refunded Their Contribution


### Low Risk Findings
    
- L-01. Refund function allows withdrawals when deadline is not set (deadline = 0)
    
- L-02. The set_deadline function does not set the dealine_set flag to true
    
- L-03. No Fund Goal Validation 
    
- L-04. Unsafe Direct Lamport Manipulation in refund(), withdraw() Functions
    
- L-05. Unclaimed rent from fund and contribution accounts leads to permanent SOL lockup















    