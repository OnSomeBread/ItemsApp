"use client";

import { useRouter } from "next/navigation";
import { ALL_TRADERS } from "../constants";

interface Props {
  trader: string;
  isKappa: boolean;
  isLightkeeper: boolean;
}

function TraderSelect({ trader, isKappa, isLightkeeper }: Props) {
  const router = useRouter();
  return (
    <>
      <select
        className="!mt-2 !ml-4 !w-80"
        onChange={(e) =>
          router.push(
            "/task_tree?trader=" +
              e.target.value +
              "&isKappa=" +
              isKappa +
              "&isLightkeeper=" +
              isLightkeeper
          )
        }
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
          onChange={(e) =>
            router.push(
              "/task_tree?trader=" +
                trader +
                "&isKappa=" +
                e.target.checked +
                "&isLightkeeper=" +
                isLightkeeper
            )
          }
        />
      </label>
      <label className="pl-4">
        is lightkeeper?{" "}
        <input
          type="checkbox"
          defaultChecked={isLightkeeper}
          onChange={(e) =>
            router.push(
              "/task_tree?trader=" +
                trader +
                "&isKappa=" +
                isKappa +
                "&isLightkeeper=" +
                e.target.checked
            )
          }
        />
      </label>
    </>
  );
}

export default TraderSelect;
