import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import LessonForm from './components/LessonForm';
import ContentInput from './components/ContentInput';
import ResultDisplay from './components/ResultDisplay';
import { Subject, OriginalDocxFile } from './types';
import { generateNLSLessonPlan } from './services/geminiService';
import { Sparkles, Settings2, Key, Crown, Clock } from 'lucide-react';
import ApiKeyModal from './components/ApiKeyModal';
import TrialModal from './components/TrialModal';
import SubscriptionModal from './components/SubscriptionModal';
import ChatWidget from './components/ChatWidget';
import { useMembership } from './hooks/useMembership';

const App: React.FC = () => {
  // State for Form
  const [subject, setSubject] = useState<Subject>(Subject.TOAN);
  const [grade, setGrade] = useState<number>(7);

  // Content States
  const [lessonContent, setLessonContent] = useState<string>('');
  const [distributionContent, setDistributionContent] = useState<string>('');

  // State for Options
  const [analyzeOnly, setAnalyzeOnly] = useState(false);
  const [detailedReport, setDetailedReport] = useState(false);

  // App State
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // API Key State
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);

  // State lưu trữ file DOCX gốc cho XML Injection
  const [originalDocx, setOriginalDocx] = useState<OriginalDocxFile | null>(null);

  // Membership State
  const {
    membership,
    startTrial,
    activatePremium,
    canAccess,
    needsTrialModal,
    needsSubscriptionModal
  } = useMembership();

  const [showTrialModal, setShowTrialModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('GEMINI_API_KEY');
    if (storedKey) {
      setApiKey(storedKey);
    } else {
      setShowApiKeyModal(true);
    }
  }, []);

  // Check membership status on load
  useEffect(() => {
    if (needsTrialModal()) {
      setShowTrialModal(true);
    } else if (needsSubscriptionModal()) {
      setShowSubscriptionModal(true);
    }
  }, [membership.status]);

  const handleSaveApiKey = (key: string) => {
    localStorage.setItem('GEMINI_API_KEY', key);
    setApiKey(key);
    setShowApiKeyModal(false);
  };

  const handleAcceptTrial = () => {
    startTrial();
    setShowTrialModal(false);
  };

  const handleConfirmPayment = () => {
    // Note: In real app, this should be verified server-side
    // For now, just close modal - admin will activate manually
    setShowSubscriptionModal(false);
  };

  const handleProcess = async () => {
    // Check membership before processing
    if (!canAccess()) {
      if (needsTrialModal()) {
        setShowTrialModal(true);
      } else {
        setShowSubscriptionModal(true);
      }
      return;
    }

    if (!lessonContent || lessonContent.trim().length === 0) {
      setError("Vui lòng tải lên file giáo án (Giáo án trống hoặc chưa được tải).");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Pass both contents to service
      const generatedText = await generateNLSLessonPlan(
        {
          subject,
          grade,
          content: lessonContent,
          distributionContent: distributionContent
        },
        { analyzeOnly, detailedReport, comparisonExport: false, apiKey }
      );

      if (!generatedText || generatedText.trim().length === 0) {
        throw new Error("AI trả về kết quả rỗng. Vui lòng thử lại với file giáo án rõ ràng hơn.");
      }

      setResult(generatedText);
    } catch (err: any) {
      console.error("Process Error:", err);
      setError(err.message || "Đã xảy ra lỗi không xác định khi kết nối với AI.");
    } finally {
      setLoading(false);
    }
  };

  // Get membership status display
  const getMembershipBadge = () => {
    switch (membership.status) {
      case 'premium':
        return (
          <div className="flex items-center space-x-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-900 px-3 py-1.5 rounded-full text-sm font-medium">
            <Crown size={16} />
            <span>Premium - {membership.daysRemaining} ngày</span>
          </div>
        );
      case 'trial':
        return (
          <div className="flex items-center space-x-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">
            <Clock size={16} />
            <span>Dùng thử - {membership.daysRemaining > 0 ? `${membership.daysRemaining} ngày` : 'Hôm nay'}</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#E3F2FD] font-sans pb-12">
      <Header onOpenSettings={() => setShowApiKeyModal(true)} />

      <main className="max-w-5xl mx-auto px-4 mt-8">
        {/* Membership Status Banner */}
        {(membership.status === 'trial' || membership.status === 'premium') && (
          <div className="mb-6 flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-blue-100">
            <div className="flex items-center space-x-3">
              {getMembershipBadge()}
              {membership.status === 'trial' && (
                <span className="text-sm text-slate-600">
                  Nâng cấp Premium để tiếp tục sử dụng sau khi hết hạn
                </span>
              )}
            </div>
            {membership.status === 'trial' && (
              <button
                onClick={() => setShowSubscriptionModal(true)}
                className="bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-900 px-4 py-2 rounded-lg text-sm font-bold hover:shadow-lg transition-all"
              >
                🌟 Nâng cấp ngay
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Inputs */}
          <div className="lg:col-span-2 space-y-6">
            <LessonForm
              subject={subject} setSubject={setSubject}
              grade={grade} setGrade={setGrade}
            />

            <ContentInput
              lessonContent={lessonContent}
              setLessonContent={setLessonContent}
              distributionContent={distributionContent}
              setDistributionContent={setDistributionContent}
              onOriginalDocxLoaded={setOriginalDocx}
            />

            {/* Options Panel */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
              <div className="flex items-center mb-4">
                <Settings2 className="text-blue-600 mr-2" size={20} />
                <h3 className="font-semibold text-blue-900">Tùy chọn nâng cao</h3>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={analyzeOnly}
                    onChange={(e) => setAnalyzeOnly(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Chỉ phân tích, không chỉnh sửa</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={detailedReport}
                    onChange={(e) => setDetailedReport(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Kèm báo cáo chi tiết</span>
                </label>
              </div>
            </div>

            {/* API Key Config Button */}
            <div className="flex justify-end items-center space-x-3">
              {!apiKey && (
                <span className="text-sm text-orange-600 font-medium animate-pulse">
                  ⚠️ Vui lòng lấy API KEY trước khi sử dụng app
                </span>
              )}
              <button
                onClick={() => setShowApiKeyModal(true)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <Key size={16} />
                <span>Cấu hình API Key</span>
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                <span className="font-medium mr-2">Lỗi:</span> {error}
              </div>
            )}

            <button
              onClick={handleProcess}
              disabled={loading}
              className={`w-full py-4 rounded-xl shadow-lg flex items-center justify-center space-x-2 text-white font-bold text-lg transition-all transform hover:-translate-y-1 ${loading
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-800 hover:shadow-blue-500/30'
                }`}
            >
              {loading ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <Sparkles size={24} />
                  <span>BẮT ĐẦU SOẠN GIÁO ÁN</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Info */}
          <div className="hidden lg:block space-y-6">
            <div className="bg-blue-800 text-white p-6 rounded-xl shadow-md">
              <h3 className="font-bold text-lg mb-4">Hướng dẫn nhanh</h3>
              <ul className="space-y-3 text-blue-100 text-sm">
                <li className="flex items-start">
                  <span className="bg-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">1</span>
                  Chọn môn học và khối lớp.
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">2</span>
                  <b>Bắt buộc:</b> Tải lên file giáo án (.docx hoặc .pdf).
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-500/50 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">3</span>
                  <i>Tùy chọn:</i> Tải file PPCT nếu muốn AI tham khảo năng lực cụ thể của trường.
                </li>
              </ul>
            </div>

            {/* Upgrade CTA */}
            {membership.status === 'trial' && (
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-white p-6 rounded-xl shadow-md">
                <h3 className="font-bold text-lg mb-2">🔥 Ưu đãi đặc biệt!</h3>
                <p className="text-sm opacity-90 mb-4">
                  Chỉ <strong>200.000đ/năm</strong> - Trải nghiệm không giới hạn!
                </p>
                <button
                  onClick={() => setShowSubscriptionModal(true)}
                  className="w-full bg-white text-orange-600 font-bold py-2 rounded-lg hover:bg-orange-50 transition-colors"
                >
                  Nâng cấp Premium
                </button>
              </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
              <h3 className="font-bold text-blue-900 mb-2">Miền năng lực số</h3>
              <div className="space-y-2">
                {[
                  "Khai thác dữ liệu và thông tin",
                  "Giao tiếp và Hợp tác",
                  "Sáng tạo nội dung số",
                  "An toàn số",
                  "Giải quyết vấn đề",
                  "Ứng dụng AI"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center text-sm text-slate-600">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Result Section */}
        <div className="mt-8">
          <ResultDisplay result={result} loading={loading} originalDocx={originalDocx} />
        </div>
      </main>

      <footer className="mt-12 text-center text-blue-800/60 text-sm py-6">
        <p>© 2024 NLS Assistant. Built with Gemini API & React.</p>
        <div className="mt-3 space-y-1 text-blue-800 font-medium">
          <p>Mọi thông tin vui lòng liên hệ:</p>
          <p>
            FB: <a href="https://www.facebook.com/share/1FUqLbE7FQ/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">https://www.facebook.com/share/1FUqLbE7FQ/?mibextid=wwXIfr</a>
          </p>
          <p>Zalo: 0915213717</p>
        </div>
      </footer>

      {/* Modals */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onSave={handleSaveApiKey}
        onClose={() => setShowApiKeyModal(false)}
        initialKey={apiKey}
      />

      <TrialModal
        isOpen={showTrialModal}
        onAccept={handleAcceptTrial}
        onClose={() => setShowTrialModal(false)}
      />

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onConfirmPayment={handleConfirmPayment}
        daysRemaining={membership.daysRemaining}
        isExpired={membership.status === 'trial_expired' || membership.status === 'premium_expired'}
      />

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
};

export default App;
