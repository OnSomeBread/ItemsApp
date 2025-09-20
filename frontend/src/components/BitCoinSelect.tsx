"use client";

import { useRouter } from "next/navigation";

interface Props {
  hideoutLvl: number;
  fuelType: string;
  hasSolar: string;
}
function BitCoinSelect({ hideoutLvl, fuelType, hasSolar }: Props) {
  const router = useRouter();
  const pushRoute = (replace_key: string, replace_value: string | number) => {
    const mapping = new Map<string, string | number>();
    mapping.set("hideoutLvl", hideoutLvl);
    mapping.set("fuelType", fuelType);
    mapping.set("hasSolar", hasSolar);

    const params = new URLSearchParams();
    for (const [key, value] of mapping.entries()) {
      if (key === replace_key) {
        params.append(replace_key, replace_value.toString());
      } else {
        params.append(key, value.toString());
      }
    }

    router.push("/bitcoin?" + params.toString());
  };

  return (
    <div className="flex w-240 gap-2 px-3 pt-1">
      <select
        onChange={(e) => pushRoute("hideoutLvl", Number(e.target.value))}
        defaultValue={hideoutLvl}
      >
        {[...Array(50).keys()].map((num) => (
          <option key={num + 1} value={num + 1}>
            Hideout Level: {num + 1}
          </option>
        ))}
      </select>

      <select
        onChange={(e) => pushRoute("fuelType", e.target.value)}
        defaultValue={fuelType}
      >
        <option key="largeFuel" value="largeFuel">
          Fuel Type: Metal fuel tank
        </option>
        <option key="smallFuel" value="smallFuel">
          Fuel Type: Expeditionary fuel tank
        </option>
      </select>

      {/* <select
        onChange={(e) => pushRoute("hasSolar", e.target.value)}
        defaultValue={"yes"}
      >
        <option key="yes" value="yes">
          Has Solar?: Yes
        </option>
        <option key="no" value="no">
          Has Solar?: No
        </option>
      </select> */}
    </div>
  );
}

export default BitCoinSelect;
