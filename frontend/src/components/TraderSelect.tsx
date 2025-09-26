"use client";

import { useRouter } from "next/navigation";
import { ALL_TRADERS } from "../constants";

interface Props {
  trader: string;
  isKappa: boolean;
  isLightkeeper: boolean;
  includeCompleted: boolean;
}

function TraderSelect({
  trader,
  isKappa,
  isLightkeeper,
  includeCompleted,
}: Props) {
  const router = useRouter();
  const pushRoute = (replace_key: string, replace_value: string | boolean) => {
    const mapping = new Map<string, string | boolean>();
    mapping.set("trader", trader);
    mapping.set("is_kappa", isKappa);
    mapping.set("is_lightkeeper", isLightkeeper);
    mapping.set("include_completed", includeCompleted);

    const params = new URLSearchParams();
    for (const [key, value] of mapping.entries()) {
      if (key === replace_key) {
        params.append(replace_key, replace_value.toString());
      } else {
        params.append(key, value.toString());
      }
    }

    router.push("/task_tree?" + params.toString());
  };

  return (
    <>
      <select
        className="!mt-2 !ml-4 !w-80"
        onChange={(e) => pushRoute("trader", e.target.value)}
        defaultValue={trader}
      >
        {Object.entries(ALL_TRADERS)
          //.filter((trader) => trader[0] !== "any")
          .map(([key, value]) => (
            <option key={key} value={key}>
              Trader: {value}
            </option>
          ))}
      </select>
      <label className="pl-4">
        is kappa?{" "}
        <input
          type="checkbox"
          defaultChecked={isKappa}
          onChange={(e) => pushRoute("is_kappa", e.target.checked)}
        />
      </label>
      <label className="pl-4">
        is lightkeeper?{" "}
        <input
          type="checkbox"
          defaultChecked={isLightkeeper}
          onChange={(e) => pushRoute("is_lightkeeper", e.target.checked)}
        />
      </label>
      <label className="pl-4">
        Include Completed Tasks?{" "}
        <input
          type="checkbox"
          defaultChecked={includeCompleted}
          onChange={(e) => pushRoute("include_completed", e.target.checked)}
        />
      </label>
    </>
  );
}

export default TraderSelect;
