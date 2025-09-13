// Mock Hemp Supplier Connector
// This demonstrates the connector interface for external data sources

export const name = 'mock-hemp-supplier';

export async function fetchAndNormalize(token: string | null, criteria: any): Promise<any[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  
  // Mock hemp supplier data
  const mockData = [
    {
      id: 'hemp-001',
      title: 'Premium Hemp Fiber - Industrial Grade',
      category: 'hemp',
      quantity: 1000,
      unit: 'kg',
      pricePerUnit: 45.50,
      currency: 'ZAR',
      location: 'Western Cape, South Africa',
      latitude: -33.9249,
      longitude: 18.4241,
      supplier: 'Cape Hemp Co.',
      quality: 'Premium',
      certifications: ['Organic', 'SAHPRA'],
      description: 'High-quality industrial hemp fiber suitable for textiles and rope manufacturing.',
      availableFrom: new Date().toISOString(),
      socialImpactScore: 85,
      socialImpactCategory: 'Job Creation',
      isVerified: true,
      source: 'mock-hemp-supplier'
    },
    {
      id: 'hemp-002', 
      title: 'Hemp Seeds - Food Grade',
      category: 'hemp',
      quantity: 500,
      unit: 'kg',
      pricePerUnit: 120.00,
      currency: 'ZAR',
      location: 'KwaZulu-Natal, South Africa',
      latitude: -29.8587,
      longitude: 31.0218,
      supplier: 'KZN Hemp Farms',
      quality: 'Standard',
      certifications: ['Food Grade', 'Organic'],
      description: 'Nutritious hemp seeds for food production and dietary supplements.',
      availableFrom: new Date().toISOString(),
      socialImpactScore: 78,
      socialImpactCategory: 'Food Security',
      isVerified: true,
      source: 'mock-hemp-supplier'
    },
    {
      id: 'hemp-003',
      title: 'Hemp Oil - CBD Extract',
      category: 'hemp',
      quantity: 50,
      unit: 'L',
      pricePerUnit: 2500.00,
      currency: 'ZAR',
      location: 'Gauteng, South Africa',
      latitude: -26.2041,
      longitude: 28.0473,
      supplier: 'Highveld Hemp Extracts',
      quality: 'Premium',
      certifications: ['Lab Tested', 'SAHPRA'],
      description: 'High-quality CBD oil extract for therapeutic and wellness applications.',
      availableFrom: new Date().toISOString(),
      socialImpactScore: 90,
      socialImpactCategory: 'Healthcare',
      isVerified: true,
      source: 'mock-hemp-supplier'
    }
  ];

  // Filter based on criteria
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

  return filtered;
}