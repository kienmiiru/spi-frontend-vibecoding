import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import spiLogo from "../assets/spi_logo.png";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const user = await login(form);
      const redirectUrl = {
        'BMN': 'bmn',
        'KEUANGAN': 'keuangan',
        'PBJ': 'pbj',
        'SDM': 'sdm',
        'SMM_SMAP': 'smm-smap',
      }

      navigate(`/${redirectUrl[user.role]}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-c-cream-50 font-poppins p-4">
      <div className="box-border flex flex-col w-[90vw] md:w-[45vw] min-h-[45vh] rounded-2xl shadow-lg overflow-hidden bg-white border border-gray-100">
        
        {/* Header */}
        <div className="bg-c-maroon flex items-center justify-center py-6 px-4">
          <img src={spiLogo} alt="SPI Logo" className="h-16 object-contain" />
        </div>

        {/* White container below header */}
        <div className="flex-1 bg-white flex flex-col justify-center items-center p-16">
          <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col items-center gap-6">
            
            {/* Username */}
            <div className="w-full flex flex-col items-start">
              <label className="flex justify-center gap-2 text-[12px] font-medium text-gray-700 mb-2">
                <User className="w-5 h-5 text-gray-500" />
                Username
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) =>
                  setForm({
                    ...form,
                    username: e.target.value,
                  })
                }
                className="w-full border-black bg-c-cream-50 border rounded-xl px-4 py-1 outline-none text-gray-800"
                required
              />
            </div>

            {/* Password */}
            <div className="w-full flex flex-col items-start">
              <label className="flex justify-center gap-2 text-[12px] font-medium text-gray-700 mb-2">
                <Lock className="w-5 h-5 text-gray-500" />
                Password
              </label>
              <div className="relative w-full">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      password: e.target.value,
                    })
                  }
                  className="w-full border-black bg-c-cream-50 border rounded-xl px-4 py-1 outline-none text-gray-800"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="w-full bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm text-center border border-red-100">
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="bg-c-success text-white py-2 w-[40%] rounded-xl text-[16px] font-semibold shadow-sm hover:shadow-md active:scale-[0.99] transition-all cursor-pointer flex justify-center items-center mt-2"
            >
              {loading ? "Loading..." : "Login"}
            </button>

          </form>
        </div>

      </div>
    </div>
  );
}
