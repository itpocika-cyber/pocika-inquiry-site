# Field Mapping

This document maps the fields from the original POCIKA Inquiry & Sales Visit Form PDF to the HTML implementation, the frontend `inquiryData` object, and their future API mappings.

| PDF Field | Application Section | HTML Component | Data Path | Required | Conditional Logic | Review | Future API Field | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Inquiry / Visit No.** | Contact | text `inquiryNumber` | `inquiryNumber` | System | None | Yes | `inquiryNumber` | Generated on submit |
| **Date** | Contact | date `date` | `date` | Yes | None | Yes | `date` | Defaults to today |
| **Sales Person** | Contact | text `salesPerson` | `salesPerson` | No | None | Yes | `salesPersonId` | Will map to user ID |
| **Company / Client Name** | Contact | text `customer.companyName` | `customer.companyName` | Yes | None | Yes | `customer.companyName` | - |
| **Contact Person** | Contact | text `customer.contactPerson` | `customer.contactPerson` | Yes | None | Yes | `customer.contactPerson` | - |
| **Designation** | Contact | text `customer.designation` | `customer.designation` | No | None | Yes | `customer.designation` | - |
| **Mobile No.** | Contact | tel `customer.mobile` | `customer.mobile` | Yes | None | Yes | `customer.mobile` | 10 digits validation |
| **Email** | Contact | email `customer.email` | `customer.email` | No | None | Yes | `customer.email` | Email validation |
| **Company / Billing Address** | Contact | textarea `customer.billingAddress` | `customer.billingAddress` | No | None | Yes | `customer.billingAddress` | - |
| **Site / Visit Location** | Contact | text `customer.siteLocation` | `customer.siteLocation` | Yes | None | Yes | `customer.siteLocation` | - |
| **GST No.** | Contact | text `customer.gstNo` | `customer.gstNo` | No | None | Yes | `customer.gstNo` | - |
| **Customer Type** | Customer | radio `business.customerType` | `business.customerType` | Yes | Shows Other | Yes | `business.customerType` | - |
| **Other Customer Type** | Customer | text `business.customerTypeOther`| `business.customerTypeOther`| If Other| Required if Retail/Other | Yes | `business.customerTypeOther`| - |
| **Industry / Business Type** | Customer | text `business.industryType` | `business.industryType` | No | None | Yes | `business.industryType` | - |
| **Location / GIDC** | Customer | text `business.locationGidc` | `business.locationGidc` | No | None | Yes | `business.locationGidc` | - |
| **Facility** | Customer | radio `business.facility` | `business.facility` | Yes | Shows Other | Yes | `business.facility` | - |
| **Other Facility** | Customer | text `business.facilityOther` | `business.facilityOther` | If Other| Required if Other | Yes | `business.facilityOther` | - |
| **Approx. Area** | Customer | number `business.areaSqft` | `business.areaSqft` | No | None | Yes | `business.areaSqft` | - |
| **Floors** | Customer | number `business.floors` | `business.floors` | No | None | Yes | `business.floors` | - |
| **Project / Facility Status** | Customer | radio `business.status` | `business.status` | Yes | None | Yes | `business.status` | - |
| **Expected Requirement Date** | Customer | date `business.expectedDate` | `business.expectedDate` | No | None | Yes | `business.expectedDate` | - |
| **Products (Multiple)** | Requirement | checkbox `products` | `products[]` | Yes | Shows Other | Yes | `products[]` | At least 1 required |
| **Other Product** | Requirement | text `productOther` | `productOther` | If Other| Required if Other | Yes | `productOther` | - |
| **Required Product / Spec** | Requirement | textarea `requirement.productSpecification` | `requirement.productSpecification`| No | None | Yes | `requirement.productSpecification`| - |
| **Estimated Quantity** | Requirement | text `requirement.estimatedQuantity`| `requirement.estimatedQuantity` | No | None | Yes | `requirement.estimatedQuantity` | - |
| **Current Brand / Supplier** | Requirement | text `requirement.currentBrand` | `requirement.currentBrand` | No | None | Yes | `requirement.currentBrand` | - |
| **Current Purchase / Req.** | Requirement | textarea `requirement.currentPurchase`| `requirement.currentPurchase` | No | None | Yes | `requirement.currentPurchase` | - |
| **Reason** | Requirement | radio `requirement.reason` | `requirement.reason` | No | None | Yes | `requirement.reason` | - |
| **Approx. Requirement Value** | Commercial | text `commercial.requirementValue` | `commercial.requirementValue` | No | None | Yes | `commercial.requirementValue` | - |
| **Expected Order Value** | Commercial | text `commercial.expectedOrderValue` | `commercial.expectedOrderValue` | No | None | Yes | `commercial.expectedOrderValue` | - |
| **Budget** | Commercial | radio `commercial.budget` | `commercial.budget` | No | None | Yes | `commercial.budget` | - |
| **Payment Terms Expected** | Commercial | text `commercial.paymentTerms` | `commercial.paymentTerms` | No | None | Yes | `commercial.paymentTerms` | - |
| **Competitor / Brands** | Commercial | text `commercial.competitors` | `commercial.competitors` | No | None | Yes | `commercial.competitors` | - |
| **Decision Maker Name** | Commercial | text `commercial.decisionMakerName`| `commercial.decisionMakerName` | No | None | Yes | `commercial.decisionMakerName` | - |
| **Decision Maker Designation**| Commercial | text `commercial.decisionMakerDesignation`| `commercial.decisionMakerDesignation`| No | None | Yes | `commercial.decisionMakerDesignation`| - |
| **Decision Maker / Influencer**| Commercial| radio `commercial.decisionRole` | `commercial.decisionRole` | No | None | Yes | `commercial.decisionRole` | - |
| **Purchase Decision By** | Commercial | date `commercial.purchaseDecisionBy` | `commercial.purchaseDecisionBy` | No | None | Yes | `commercial.purchaseDecisionBy` | - |
| **Visit Type** | Opportunity | radio `visit.visitType` | `visit.visitType` | Yes | None | Yes | `visit.visitType` | - |
| **Person Met** | Opportunity | text `visit.personMet` | `visit.personMet` | No | None | Yes | `visit.personMet` | - |
| **Requirement Discussed** | Opportunity | textarea `visit.requirementDiscussed`| `visit.requirementDiscussed` | No | None | Yes | `visit.requirementDiscussed` | - |
| **Photos Requirement** | Opportunity | radio `visit.photos` | `visit.photos` | Yes | Taken/Not Req | Yes | `visit.photos` | Controls upload |
| **Opportunity Status** | Opportunity | radio `visit.opportunity` | `visit.opportunity` | Yes | None | Yes | `visit.opportunity` | - |
| **Next action** | Follow-up | checkbox `followUp.nextAction` | `followUp.nextAction[]` | No | Shows Quotation | Yes | `followUp.nextAction[]` | - |
| **Quotation Required By** | Follow-up | date `followUp.quotationDate` | `followUp.quotationDate` | If Quote| Required if Quotation | Yes | `followUp.quotationDate` | - |
| **Next visit / action type** | Follow-up | radio `followUp.nextVisitType` | `followUp.nextVisitType` | No | None | Yes | `followUp.nextVisitType` | - |
| **Next Follow-up Date** | Follow-up | date `followUp.followUpDate` | `followUp.followUpDate` | Yes | None | Yes | `followUp.followUpDate` | - |
| **Next Action / Commitment** | Follow-up | textarea `followUp.nextActionCommitment`| `followUp.nextActionCommitment`| No | None | Yes | `followUp.nextActionCommitment`| - |
| **Visit Remarks / Special Req.**| Remarks | textarea `remarks` | `remarks` | No | None | Yes | `remarks` | - |
| **Site Photos** | Remarks | file `<input type="file">` | `photos[]` | No | If Taken | Yes | `photoUrls[]` | Up to 5. Backend will use Firebase Storage. |
