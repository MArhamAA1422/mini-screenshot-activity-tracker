/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Building2, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { validateSignup } from "../utils/validators";

const PLANS = [
  { id: 1, name: "Basic", price: 2, description: "Perfect for small teams" },
  { id: 2, name: "Pro", price: 5, description: "Best for growing companies" },
  {
    id: 3,
    name: "Enterprise",
    price: 10,
    description: "For large organizations",
  },
];

export default function SignupPage() {
  const navigate = useNavigate();
  const { user, signup, isAdmin, isEmployee } = useAuth();

  useEffect(() => {
    if (user) {
      if (isAdmin) {
        navigate("/admin/employees");
      } else if (isEmployee) {
        navigate("/employee/dashboard");
      }
    }
  }, [user, navigate, isAdmin, isEmployee]);

  const [formData, setFormData] = useState({
    ownerName: "",
    ownerEmail: "",
    companyName: "",
    planId: 1,
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateSignup(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      await signup({
        ownerName: formData.ownerName,
        ownerEmail: formData.ownerEmail,
        companyName: formData.companyName,
        planId: formData.planId,
        password: formData.password,
      });

      navigate("/admin/employees");
    } catch (err: any) {
      setError(err.response?.data?.error || "Signup failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Create Company Account
          </h1>
          <p className="text-gray-600 mt-2">
            Start tracking your team's activity today
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Company Details
              </h3>

              <div>
                <label
                  htmlFor="companyName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Company Name *
                </label>
                <input
                  id="companyName"
                  type="text"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Owner Details
              </h3>

              <div>
                <label
                  htmlFor="ownerName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Your Name *
                </label>
                <input
                  id="ownerName"
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) =>
                    setFormData({ ...formData, ownerName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label
                  htmlFor="ownerEmail"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Your Email *
                </label>
                <input
                  id="ownerEmail"
                  type="email"
                  value={formData.ownerEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, ownerEmail: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Password *
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Select Plan
              </h3>

              <div className="grid grid-cols-3 gap-4">
                {PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, planId: plan.id })
                    }
                    className={`p-4 border-2 rounded-lg transition ${
                      formData.planId === plan.id
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                    disabled={isLoading}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">
                        {plan.name}
                      </span>
                      {formData.planId === plan.id && (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      ${plan.price}
                      <span className="text-sm text-gray-500">/employee</span>
                    </div>
                    <p className="text-xs text-gray-600">{plan.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? "Creating account..." : "Create Company Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
