import fetch from 'node-fetch';

const minimalPayload = {
  inquiryNumber: "",
  date: new Date().toISOString().split('T')[0],
  salesPerson: "Demo Salesperson",
  customer: {
    companyName: "Test Company",
    contactPerson: "John Doe",
    designation: "",
    mobile: "1234567890",
    email: "",
    billingAddress: "",
    siteLocation: "Test Site",
    gstNo: ""
  },
  business: {
    customerType: "GIDC/Industrial",
    customerTypeOther: "",
    industryType: "",
    locationGidc: "",
    facility: "Factory",
    facilityOther: "",
    areaSqft: "",
    floors: "",
    status: "New",
    expectedDate: ""
  },
  products: ["ABC Fire Extinguisher"],
  productOther: "",
  requirement: {
    productSpecification: "",
    estimatedQuantity: "",
    currentBrand: "",
    currentPurchase: "",
    reason: ""
  },
  commercial: {
    requirementValue: "",
    expectedOrderValue: "",
    budget: "",
    paymentTerms: "",
    decisionMakerName: "",
    decisionMakerDesignation: "",
    decisionRole: "",
    purchaseDecisionBy: "",
    competitors: ""
  },
  visit: {
    visitType: "Cold Visit",
    personMet: "",
    requirementDiscussed: "",
    photos: "Taken",
    opportunity: "HOT"
  },
  followUp: {
    nextAction: [],
    nextVisitType: "",
    quotationDate: "",
    followUpDate: "2026-10-01",
    nextActionCommitment: ""
  },
  remarks: "",
  photos: []
};

async function testSubmit() {
  try {
    const res = await fetch('http://localhost:5000/api/v1/inquiries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(minimalPayload)
    });
    
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testSubmit();
