import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { Leaf, Search, Shield, CheckCircle, Users, FileText, Lock, ArrowRight, Globe, Eye, Briefcase, TrendingUp } from "lucide-react";

export default function LandingPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Redirect to listings page with search query
    window.location.href = `/listings?search=${encodeURIComponent(searchQuery)}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="glass-nav text-white py-6">
        <div className="container mx-auto px-6 max-w-[1400px]">
          <div className="flex items-center justify-between">
            {/* Logo and Nav */}
            <div className="flex items-center space-x-12">
              <Link 
                to="/"
                className="flex items-center cursor-pointer"
              >
                <span className="text-[#d1e891] font-bold text-xl">IZENZO</span>
              </Link>
              
              <nav className="hidden md:flex space-x-8">
                <Link
                  to="/dashboard"
                  className="text-white hover:text-[#d1e891] transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  to="/listings"
                  className="text-white hover:text-[#d1e891] transition-colors"
                >
                  Listings
                </Link>
                <Link
                  to="/search"
                  className="text-white hover:text-[#d1e891] transition-colors"
                >
                  Find Options
                </Link>
                <Link
                  to="/geographic"
                  className="text-white hover:text-[#d1e891] transition-colors"
                >
                  Map View
                </Link>
              </nav>
            </div>
            
            {/* Search and User Actions */}
            <div className="flex items-center space-x-4">
              <form onSubmit={handleSearch} className="hidden md:flex relative">
                <Input 
                  type="search" 
                  placeholder="Search listings..." 
                  className="glass-input text-white placeholder:text-white/60 focus-visible:ring-[#d1e891] w-[200px] border-0"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
              </form>
              
              {user ? (
                <Button 
                  onClick={() => navigate("/dashboard")}
                  className="glass-button text-white hover:text-white font-medium"
                >
                  Dashboard
                </Button>
              ) : (
                <Button 
                  onClick={() => navigate("/auth")}
                  className="glass-button text-white hover:text-white font-medium"
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* Legal Ribbon */}
      <div className="bg-[#173c1e] text-white py-2">
        <div className="container mx-auto px-6 max-w-[1400px]">
          <p className="text-sm text-center">
            Available only in permitted jurisdictions. We verify identity and licences and keep an auditable trail for every transaction.
          </p>
        </div>
      </div>

      {/* Hero Section */}
      <main className="flex-grow bg-[#f9fbe7]">
        <div className="container mx-auto px-6 max-w-[1400px]">
          <div className="flex justify-center items-center min-h-[calc(100vh-140px)]">
            <div className="flex flex-col justify-center items-center py-16 lg:py-24 text-center max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#173c1e] mb-6">
                The trusted marketplace for 
                <span className="block text-[#d1e891]">legal hemp & cannabis trade</span>
              </h1>
              
              <p className="text-[#173c1e]/80 text-xl mb-8 max-w-3xl">
                Standardised disclosures, verified participants, and comparable pricing—so qualified deals happen faster, compliantly.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4 mb-4">
                <Button 
                  onClick={() => navigate("/search")}
                  className="bg-[#a8c566] hover:bg-[#a8c566]/90 text-white px-8 py-3 font-semibold"
                >
                  Post a Buy Signal
                </Button>
                <Button 
                  onClick={() => navigate("/listings")}
                  className="bg-[#173c1e] hover:bg-[#173c1e]/90 text-white px-8 py-3 font-semibold"
                >
                  Browse Verified Supply
                </Button>
              </div>
              
              <Button 
                onClick={() => navigate("/broker-apply")}
                variant="outline" 
                className="border-[#173c1e]/50 text-[#173c1e] hover:bg-[#173c1e]/10 px-6 py-2"
              >
                Apply as a Broker
              </Button>
            </div>
          </div>
        </div>

        {/* Jurisdiction & Compliance Gate */}
        <section className="bg-white py-12">
          <div className="container mx-auto px-6 max-w-[1400px]">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-[#173c1e] mb-4">Where are you trading from?</h2>
              <div className="flex gap-4 mb-4">
                <select className="flex-1 px-4 py-3 border border-gray-300 rounded-lg">
                  <option>Select Country</option>
                  <option>South Africa</option>
                  <option>United States</option>
                  <option>Canada</option>
                  <option>Netherlands</option>
                </select>
                <select className="flex-1 px-4 py-3 border border-gray-300 rounded-lg">
                  <option>Select Region</option>
                  <option>Eastern Cape</option>
                  <option>Western Cape</option>
                  <option>Gauteng</option>
                </select>
              </div>
              <p className="text-gray-600 text-sm">
                We only enable trading features where permitted by law. In restricted regions, you can view educational content and contact support.
              </p>
            </div>
          </div>
        </section>

        {/* Proof of Trust Metrics */}
        <section className="bg-[#f9fbe7] py-12">
          <div className="container mx-auto px-6 max-w-[1400px]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="p-6">
                <div className="text-3xl font-bold text-[#173c1e] mb-2">1,248</div>
                <div className="text-gray-600">licences & COAs on file</div>
              </div>
              <div className="p-6">
                <div className="text-3xl font-bold text-[#173c1e] mb-2">312</div>
                <div className="text-gray-600">verified businesses (KYC/KYB)</div>
              </div>
              <div className="p-6">
                <div className="text-3xl font-bold text-[#173c1e] mb-2">99.6%</div>
                <div className="text-gray-600">uptime (last 30 days)</div>
              </div>
              <div className="p-6">
                <div className="text-3xl font-bold text-[#173c1e] mb-2">48–72h</div>
                <div className="text-gray-600">median time-to-first qualified option</div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-white py-16">
          <div className="container mx-auto px-6 max-w-[1400px]">
            <h2 className="text-3xl font-bold text-center text-[#173c1e] mb-12">How it works</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { number: "1", title: "Verify", desc: "We KYC/KYB buyers, sellers and brokers.", icon: Shield },
                { number: "2", title: "Signal", desc: "Post what you need (or have), with standardised disclosures.", icon: FileText },
                { number: "3", title: "Compare", desc: "We return comparable options from verified sources.", icon: TrendingUp },
                { number: "4", title: "Check", desc: "COAs/licences attached; trust badges visible.", icon: CheckCircle },
                { number: "5", title: "Transact", desc: "Use escrow/LC/EFT per jurisdiction and counterparties.", icon: Lock },
                { number: "6", title: "Audit", desc: "Every action has a consent receipt and immutable log.", icon: Eye }
              ].map((step, i) => (
                <Card key={i} className="p-6 border border-gray-200">
                  <CardContent className="p-0">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 bg-[#a8c566] text-white rounded-full flex items-center justify-center font-bold mr-3">
                        {step.number}
                      </div>
                      <step.icon className="w-6 h-6 text-[#173c1e]" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#173c1e] mb-2">{step.title}</h3>
                    <p className="text-gray-600">{step.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Price Discovery & Disclosure */}
        <section className="bg-[#f9fbe7] py-16">
          <div className="container mx-auto px-6 max-w-[1400px]">
            <div className="max-w-4xl mx-auto text-center mb-12">
              <h2 className="text-3xl font-bold text-[#173c1e] mb-4">Better price discovery through standardisation</h2>
              <p className="text-lg text-gray-700">
                We normalise units and disclosures so every option is apples-to-apples: quantity, grade/specs, region, currency, and verified documentation. That narrows the bid–ask spread and speeds negotiation.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="p-6">
                <CardContent className="p-0">
                  <FileText className="w-12 h-12 text-[#a8c566] mb-4" />
                  <h3 className="text-xl font-semibold text-[#173c1e] mb-2">Universal Seller Disclosure schema</h3>
                  <p className="text-gray-600">Standardized format for all product listings and documentation</p>
                </CardContent>
              </Card>
              <Card className="p-6">
                <CardContent className="p-0">
                  <TrendingUp className="w-12 h-12 text-[#a8c566] mb-4" />
                  <h3 className="text-xl font-semibold text-[#173c1e] mb-2">Comparable pricing cards</h3>
                  <p className="text-gray-600">Currency/unit normalised for easy comparison</p>
                </CardContent>
              </Card>
              <Card className="p-6">
                <CardContent className="p-0">
                  <Globe className="w-12 h-12 text-[#a8c566] mb-4" />
                  <h3 className="text-xl font-semibold text-[#173c1e] mb-2">Market snapshot</h3>
                  <p className="text-gray-600">Median & range by category/sub-category</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Broker-Friendly */}
        <section className="bg-white py-16">
          <div className="container mx-auto px-6 max-w-[1400px]">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-[#173c1e] mb-4">Broker-friendly by design</h2>
              <p className="text-lg text-gray-700 mb-8">
                Brokers power this market. Invite sellers, manage mandates, create listings on their behalf, and get credited transparently when deals close.
              </p>
              <Button 
                onClick={() => navigate("/broker-apply")}
                className="bg-[#a8c566] hover:bg-[#a8c566]/90 text-white px-8 py-3 font-semibold"
              >
                Apply as a Broker <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <p className="text-sm text-gray-600 mt-4">Explain mandate + commission snapshot in 60 seconds</p>
            </div>
          </div>
        </section>

        {/* Trust & Security */}
        <section className="bg-[#f9fbe7] py-16">
          <div className="container mx-auto px-6 max-w-[1400px]">
            <h2 className="text-3xl font-bold text-center text-[#173c1e] mb-12">Trust & security</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Users, title: "KYC/KYB + licence verification" },
                { icon: FileText, title: "Consent receipts & audit trails" },
                { icon: Shield, title: "POPIA & GDPR data minimisation" },
                { icon: Lock, title: "Encryption at rest/in transit" }
              ].map((item, i) => (
                <Card key={i} className="p-6 text-center">
                  <CardContent className="p-0">
                    <item.icon className="w-12 h-12 text-[#a8c566] mx-auto mb-4" />
                    <h3 className="font-semibold text-[#173c1e]">{item.title}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Case Studies */}
        <section className="bg-white py-16">
          <div className="container mx-auto px-6 max-w-[1400px]">
            <h2 className="text-3xl font-bold text-center text-[#173c1e] mb-12">What our users say</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="p-8">
                <CardContent className="p-0">
                  <p className="text-lg text-gray-700 mb-4 italic">
                    "We found a qualified buyer in 48 hours with verified docs attached. Negotiations were shorter and cleaner."
                  </p>
                  <p className="font-semibold text-[#173c1e]">— Eastern Cape producer</p>
                </CardContent>
              </Card>
              <Card className="p-8">
                <CardContent className="p-0">
                  <p className="text-lg text-gray-700 mb-4 italic">
                    "Comparable options let us make an offer quickly and confidently."
                  </p>
                  <p className="font-semibold text-[#173c1e]">— EU buyer</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

      </main>
      

    </div>
  );
}