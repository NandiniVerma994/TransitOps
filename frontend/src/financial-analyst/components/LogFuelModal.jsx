import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import Modal from "./common/Modal";
import { getTripOptions, getVehicleOptions, logFuelPurchase } from "../services/financialService";

const inputClass =
  "w-full rounded-xl border border-slate-700/60 bg-[#1a1a1a] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-colors";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400";
const errorClass = "mt-1 text-xs text-rose-400";

/**
 * LogFuelModal
 * Form to record a new fuel purchase: vehicle, liters, cost, date, odometer.
 */
export default function LogFuelModal({ open, onClose, onLogged }) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [tripOptions, setTripOptions] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      vehicleId: "",
      liters: "",
      totalCost: "",
      date: new Date().toISOString().slice(0, 16),
      odometer: "",
      tripId: "",
    },
  });

  useEffect(() => {
    if (!open) return;

    let active = true;
    Promise.all([getVehicleOptions(), getTripOptions()])
      .then(([vehicles, trips]) => {
        if (!active) return;
        setVehicleOptions(vehicles || []);
        setTripOptions(trips || []);
      })
      .catch(() => {
        if (active) setSubmitError("Couldn't load vehicle options. Please try again.");
      });

    return () => {
      active = false;
    };
  }, [open]);

  const close = () => {
    reset();
    setSubmitError(null);
    onClose?.();
  };

  const onSubmit = async (values) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const entry = await logFuelPurchase({ ...values, date: new Date(values.date).toISOString() });
      onLogged?.(entry);
      reset();
      onClose?.();
    } catch {
      setSubmitError("Couldn't save this fuel log. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Log Fuel Purchase" description="Record a new fuel fill-up.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className={labelClass}>Vehicle</label>
          <select className={inputClass} {...register("vehicleId", { required: "Select a vehicle" })}>
            <option value="">Select vehicle</option>
            {vehicleOptions.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
          {errors.vehicleId && <p className={errorClass}>{errors.vehicleId.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Liters Filled</label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="0.0"
              className={inputClass}
              {...register("liters", { required: "Required", min: { value: 0.1, message: "Must be > 0" } })}
            />
            {errors.liters && <p className={errorClass}>{errors.liters.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Total Cost (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className={inputClass}
              {...register("totalCost", { required: "Required", min: { value: 0.01, message: "Must be > 0" } })}
            />
            {errors.totalCost && <p className={errorClass}>{errors.totalCost.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Date & Time</label>
            <input type="datetime-local" className={inputClass} {...register("date", { required: "Required" })} />
            {errors.date && <p className={errorClass}>{errors.date.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Odometer (km)</label>
            <input
              type="number"
              min="0"
              placeholder="0"
              className={inputClass}
              {...register("odometer", { required: "Required" })}
            />
            {errors.odometer && <p className={errorClass}>{errors.odometer.message}</p>}
          </div>
        </div>

        <div>
          <label className={labelClass}>Trip ID (optional)</label>
          <select className={inputClass} {...register("tripId")}>
            <option value="">None</option>
            {tripOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {submitError && <p className={errorClass}>{submitError}</p>}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={close}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:text-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-900/30 transition-all hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Saving..." : "Save Fuel Log"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
