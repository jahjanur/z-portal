import { useState } from "react";
interface WorkerFormProps {
  onSubmit: (data: { email: string; password: string; name: string }) => void;
  colors: { primary: string };
}

const WorkerForm: React.FC<WorkerFormProps> = ({ onSubmit, colors }) => {
  const [formData, setFormData] = useState({ email: "", password: "", name: "" });

  const handleSubmit = () => {
    onSubmit(formData);
    setFormData({ email: "", password: "", name: "" });
  };

  return (
    <div className="p-5 mb-6 border border-gray-200 bg-gray-50 rounded-xl">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">Add New Worker</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <input
          placeholder="Full name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2"
        />
        <input
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2"
        />
        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2"
        />
        <button
          onClick={handleSubmit}
          className="px-4 py-2.5 text-sm font-semibold text-white rounded-lg"
          style={{ backgroundColor: colors.primary }}
        >
          Add Worker
        </button>
      </div>
    </div>
  );
};
export default WorkerForm;