import React, { useState } from 'react';
import { 
  HelpCircle,
  Search,
  Book,
  MessageCircle,
  Mail,
  Phone,
  FileText,
  Video,
  ChevronRight,
  ExternalLink,
  Download,
  Send
} from 'lucide-react';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
}

const HelpSupportPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const categories = [
    { id: 'all', label: 'All Topics', icon: Book },
    { id: 'getting-started', label: 'Getting Started', icon: Book },
    { id: 'inventory', label: 'Inventory Management', icon: Book },
    { id: 'sku', label: 'SKU Management', icon: Book },
    { id: 'reports', label: 'Reports & Analytics', icon: FileText },
    { id: 'account', label: 'Account & Settings', icon: HelpCircle },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: HelpCircle },
  ];

  const faqs: FAQ[] = [
    {
      id: 1,
      category: 'getting-started',
      question: 'How do I create my first inventory entry?',
      answer: 'To create your first inventory entry, navigate to Inventory > Incoming Inventory. Fill in the required fields including invoice number, vendor details, and items. Click "Save" to create the entry.'
    },
    {
      id: 2,
      category: 'getting-started',
      question: 'How do I add a new SKU?',
      answer: 'Go to SKU Management and click "Add Product". Fill in the product details including name, category, brand, and initial stock. Make sure to provide all required information before saving.'
    },
    {
      id: 3,
      category: 'inventory',
      question: 'How do I track incoming inventory?',
      answer: 'Use the Incoming Inventory page to record all incoming stock. You can track by invoice number, vendor, date, and item details. The system automatically updates stock levels when you complete an incoming entry.'
    },
    {
      id: 4,
      category: 'inventory',
      question: 'What is the difference between received, rejected, and short quantities?',
      answer: 'Received is the actual quantity received. Rejected is items that failed quality inspection. Short is the difference between ordered and received quantities. All three are tracked separately for accurate inventory management.'
    },
    {
      id: 5,
      category: 'sku',
      question: 'How do I update SKU information?',
      answer: 'Navigate to SKU Management, find the SKU you want to update, and click on it to view details. Click the "Edit" button to modify any information. Changes will be reflected immediately.'
    },
    {
      id: 6,
      category: 'sku',
      question: 'What are slow-moving and non-movable items?',
      answer: 'Slow-moving items are SKUs with low sales frequency. Non-movable items haven\'t been sold within a specified period. These reports help identify inventory that may need attention or clearance.'
    },
    {
      id: 7,
      category: 'reports',
      question: 'How do I generate inventory reports?',
      answer: 'Go to Reports section and select the type of report you need. You can filter by date range, category, vendor, or SKU. Reports can be exported in various formats including PDF and Excel.'
    },
    {
      id: 8,
      category: 'reports',
      question: 'Can I schedule automatic reports?',
      answer: 'Yes, you can set up scheduled reports in the Settings > Notifications section. Choose the frequency (daily, weekly, monthly) and the report types you want to receive automatically via email.'
    },
    {
      id: 9,
      category: 'account',
      question: 'How do I change my password?',
      answer: 'Go to Profile > Security section and click "Change Password". Enter your current password and new password. Make sure your new password meets the security requirements.'
    },
    {
      id: 10,
      category: 'account',
      question: 'How do I update my company information?',
      answer: 'Navigate to Profile page and update your company details in the General Information section. Click "Save Changes" to apply updates. Some changes may require admin approval.'
    },
    {
      id: 11,
      category: 'troubleshooting',
      question: 'Why is my stock showing incorrect quantities?',
      answer: 'Check if all incoming and outgoing transactions are properly recorded. Verify that rejected and short quantities are correctly entered. If issues persist, contact support with your inventory ID.'
    },
    {
      id: 12,
      category: 'troubleshooting',
      question: 'I can\'t see certain menu options. Why?',
      answer: 'Menu visibility depends on your user role and permissions. Contact your administrator to request additional permissions if you need access to specific features.'
    },
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement contact form submission
    alert('Thank you for contacting us! We will get back to you soon.');
    setContactForm({ name: '', email: '', subject: '', message: '' });
  };

  const toggleFAQ = (id: number) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <div className="p-8 space-y-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Help & Support</h1>
          <p className="text-lg text-slate-500 font-medium">Find answers to common questions and get assistance.</p>
          </div>
        </div>

        {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Book className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Documentation</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">Comprehensive guides and tutorials</p>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
              View Docs <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Video className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Video Tutorials</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">Step-by-step video guides</p>
            <button className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center gap-1">
              Watch Videos <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Download Resources</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">Templates, guides, and PDFs</p>
            <button className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1">
              Download <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search and Categories */}
          <div className="lg:col-span-1 space-y-4">
            {/* Search */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search for help..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Categories */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
                <div className="space-y-2">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                          selectedCategory === category.id
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{category.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Contact Support */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Contact Support</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="w-5 h-5" />
                  <span className="text-sm">support@inventory.com</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="w-5 h-5" />
                  <span className="text-sm">+1 (555) 123-4567</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">Live Chat Available</span>
                </div>
              </div>
            </div>
          </div>

          {/* FAQs */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-semibold text-gray-900">
                  Frequently Asked Questions
                </h2>
              </div>

              {filteredFAQs.length === 0 ? (
                <div className="text-center py-12">
                  <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No results found. Try a different search term.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFAQs.map((faq) => (
                    <div
                      key={faq.id}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleFAQ(faq.id)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                      >
                        <span className="font-medium text-gray-900">{faq.question}</span>
                        <ChevronRight
                          className={`w-5 h-5 text-gray-400 transition-transform ${
                            expandedFAQ === faq.id ? 'transform rotate-90' : ''
                          }`}
                        />
                      </button>
                      {expandedFAQ === faq.id && (
                        <div className="px-4 pb-4 text-gray-600 text-sm">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contact Form */}
            <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
              <div className="flex items-center gap-3 mb-6">
                <MessageCircle className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-semibold text-gray-900">Contact Us</h2>
              </div>

              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Send Message
                </button>
              </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSupportPage;

