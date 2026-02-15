import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Award, Download, Share2, ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '../../utils/constants';

const Certificate = () => {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateCertificate = async (contestId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/leaderboard/${contestId}/certificate`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setCertificate(response.data.certificate);
      toast.success('Certificate generated successfully!');
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast.error(error.response?.data?.message || 'Failed to generate certificate');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My Certificate',
        text: `I earned ${certificate.rank}${getRankSuffix(certificate.rank)} rank in ${certificate.contestTitle}!`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Certificate link copied to clipboard!');
    }
  };

  const getRankSuffix = (rank) => {
    if (rank % 10 === 1 && rank % 100 !== 11) return 'st';
    if (rank % 10 === 2 && rank % 100 !== 12) return 'nd';
    if (rank % 10 === 3 && rank % 100 !== 13) return 'rd';
    return 'th';
  };

  const getMedalColor = (rank) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-orange-400';
    return 'text-primary-400';
  };

  if (!certificate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 py-16">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <Award className="w-24 h-24 text-primary-400 mx-auto mb-8" />
          <h1 className="text-2xl sm:text-4xl font-bold mb-4">Certificate Not Generated</h1>
          <p className="text-gray-400 mb-8">
            Complete the contest to generate your certificate
          </p>
          <button onClick={() => navigate('/contests')} className="btn-primary">
            View Contests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 py-16">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="flex gap-3">
            <button onClick={handleShare} className="btn-secondary">
              <Share2 className="w-5 h-5 mr-2" />
              Share
            </button>
            <button
              onClick={() => window.print()}
              className="btn-primary"
            >
              <Download className="w-5 h-5 mr-2" />
              Download
            </button>
          </div>
        </div>

        {/* Certificate */}
        <div className="bg-white rounded-lg p-6 sm:p-12 shadow-2xl print:shadow-none relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-500 via-orange-400 to-yellow-400"></div>
          <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-orange-400 to-primary-500"></div>

          {/* Content */}
          <div className="text-center space-y-6">
            {/* Logo/Badge */}
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-orange-400 flex items-center justify-center">
                <Award className="w-12 h-12 text-white" />
              </div>
            </div>

            {/* Certificate Title */}
            <div>
              <h1 className="text-3xl sm:text-5xl font-bold text-gray-800 mb-2">
                Certificate of Achievement
              </h1>
              <p className="text-gray-500 text-lg">
                This certifies that
              </p>
            </div>

            {/* User Name */}
            <div className="py-6">
              <h2 className="text-2xl sm:text-4xl font-bold text-primary-600 mb-2">
                {certificate.userName}
              </h2>
              <div className="w-64 h-1 bg-gradient-to-r from-transparent via-primary-400 to-transparent mx-auto"></div>
            </div>

            {/* Achievement Details */}
            <div className="space-y-4 py-6">
              <p className="text-xl text-gray-700">
                has successfully completed
              </p>
              <h3 className="text-xl sm:text-3xl font-bold text-gray-800">
                {certificate.contestTitle}
              </h3>
              <p className="text-xl text-gray-700">
                and secured
              </p>
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-primary-50 to-orange-50 px-8 py-4 rounded-lg">
                <Award className={`w-8 h-8 ${getMedalColor(certificate.rank)}`} />
                <span className="text-3xl font-bold text-gray-800">
                  {certificate.rank}{getRankSuffix(certificate.rank)} Rank
                </span>
              </div>
              <p className="text-lg text-gray-600">
                with a score of <span className="font-bold text-primary-600">{certificate.score}</span> points
              </p>
            </div>

            {/* Footer */}
            <div className="pt-8 sm:pt-12 mt-8 sm:mt-12 border-t-2 border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-6 sm:items-end">
                <div className="text-center sm:text-left">
                  <p className="text-sm text-gray-500 mb-1">Issue Date</p>
                  <p className="text-lg font-semibold text-gray-700">{certificate.issueDate}</p>
                </div>

                <div className="text-center">
                  <div className="w-48 border-t-2 border-gray-800 mb-2"></div>
                  <p className="text-sm font-semibold text-gray-700">Authorized Signature</p>
                </div>

                <div className="text-center sm:text-right">
                  <p className="text-sm text-gray-500 mb-1">Certificate ID</p>
                  <p className="text-lg font-mono font-semibold text-gray-700">
                    {certificate.certificateId}
                  </p>
                </div>
              </div>
            </div>

            {/* Watermark */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
              <Award className="w-96 h-96" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="text-center mt-8 print:hidden">
          <p className="text-gray-400 mb-4">
            Congratulations on your achievement! Share it with your friends and on social media.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate('/contests')}
              className="btn-secondary"
            >
              View More Contests
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Certificate;
