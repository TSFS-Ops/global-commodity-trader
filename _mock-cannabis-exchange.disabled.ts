// Mock Cannabis Exchange Connector  
// This demonstrates integration with a licensed cannabis trading platform

export const name = 'mock-cannabis-exchange';

export async function fetchAndNormalize(token: string | null, criteria: any): Promise<any[]> {
  // Simulate API delay and authentication check
  await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 300));
  
  // Mock cannabis exchange data (requires license verification)
  const mockData = [
    {
      id: 'cannabis-001',
      title: 'Medical Cannabis Flower - Indica Dominant',
      category: 'cannabis',
      quantity: 100,
      unit: 'g',
      pricePerUnit: 180.00,
      currency: 'ZAR',
      location: 'Western Cape, South Africa',
      latitude: -33.9249,
      longitude: 18.4241,
      supplier: 'MedCann SA',
      quality: 'Medical Grade',
      certifications: ['SAHPRA Licensed', 'GMP Certified'],
      description: 'High-quality medical cannabis flower for licensed dispensaries.',
      availableFrom: new Date().toISOString(),
      socialImpactScore: 88,
      socialImpactCategory: 'Healthcare',
      thc: '18-22%',
      cbd: '1-3%',
      strain: 'Purple Haze',
      isVerified: true,
      requiresLicense: true,
      source: 'mock-cannabis-exchange'
    },
    {
      id: 'cannabis-002',
      title: 'CBD Isolate - Pharmaceutical Grade',
      category: 'cannabis',
      quantity: 25,
      unit: 'g',
      pricePerUnit: 1200.00,
      currency: 'ZAR', 
      location: 'Gauteng, South Africa',
      latitude: -26.2041,
      longitude: 28.0473,
      supplier: 'SA Cannabis Labs',
      quality: 'Pharmaceutical',
      certifications: ['USP Grade', 'SAHPRA Licensed'],
      description: 'Pure CBD isolate for pharmaceutical and research applications.',
      availableFrom: new Date().toISOString(),
      socialImpactScore: 95,
      socialImpactCategory: 'Healthcare',
      thc: '0%',
      cbd: '99.9%',
      purity: '99.9%',
      isVerified: true,
      requiresLicense: true,
      source: 'mock-cannabis-exchange'
    },
    {
      id: 'cannabis-003',
      title: 'Cannabis Edibles - Medical Gummies',
      category: 'cannabis',
      quantity: 200,
      unit: 'units',
      pricePerUnit: 45.00,
      currency: 'ZAR',
      location: 'KwaZulu-Natal, South Africa', 
      latitude: -29.8587,
      longitude: 31.0218,
      supplier: 'Coastal Cannabis Kitchen',
      quality: 'Medical Grade',
      certifications: ['SAHPRA Licensed', 'Food Safe'],
      description: 'Precisely dosed cannabis gummies for medical patients.',
      availableFrom: new Date().toISOString(),
      socialImpactScore: 82,
      socialImpactCategory: 'Healthcare',
      thc: '5mg per unit',
      cbd: '10mg per unit',
      dosage: '5mg THC + 10mg CBD',
      isVerified: true,
      requiresLicense: true,
      source: 'mock-cannabis-exchange'
    }
  ];

  // Filter based on criteria (similar filtering logic)
  let filtered = mockData;
  
  if (criteria.category) {
    filtered = filtered.filter(item => 
      item.category.toLowerCase().includes(criteria.category.toLowerCase())
    );
  }
  
  if (criteria.location) {
    filtered = filtered.filter(item =>
      item.location.toLowerCase().includes(criteria.location.toLowerCase())
    );
  }
  
  if (criteria.minQuantity) {
    filtered = filtered.filter(item => item.quantity >= criteria.minQuantity);
  }
  
  if (criteria.maxPrice) {
    filtered = filtered.filter(item => item.pricePerUnit <= criteria.maxPrice);
  }

  // Simulate license requirement check
  if (criteria.requiresLicense === false) {
    filtered = filtered.filter(item => !item.requiresLicense);
  }

  return filtered;
}