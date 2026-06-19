/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { renderFormattedDate } from "@plane/utils";
// hooks
import { useTimeLineChartStore } from "@/hooks/use-timeline-chart";
//
import { HEADER_HEIGHT, SIDEBAR_WIDTH } from "../../constants";
import type { IHourBlock } from "../../views";

export const DayChartView = observer(function DayChartView() {
  const { currentViewData, renderView } = useTimeLineChartStore();
  const hourBlocks: IHourBlock[] = renderView;
  const currentHour = new Date().getHours();

  return (
    <div className="absolute top-0 left-0 flex h-max min-h-full w-max">
      {currentViewData && (
        <div className="relative flex flex-col outline-[0.25px] outline-subtle-1">
          <div
            className="sticky top-0 z-[5] w-full flex-shrink-0 bg-surface-1 outline-[1px] outline-subtle-1"
            style={{ height: `${HEADER_HEIGHT}px` }}
          >
            <div className="inline-flex h-7 w-full justify-between">
              <div
                className="sticky z-[1] m-1 flex items-center bg-surface-1 px-3 py-1 text-13 font-regular whitespace-nowrap text-secondary capitalize"
                style={{ left: `${SIDEBAR_WIDTH}px` }}
              >
                {renderFormattedDate(currentViewData.data.currentDate)}
              </div>
            </div>
            <div className="flex h-5 w-full">
              {hourBlocks.map((hourBlock) => (
                <div
                  key={`sub-title-${hourBlock.hour}`}
                  className="flex flex-shrink-0 justify-center px-2 py-1 text-center capitalize outline-[0.25px] outline-subtle-1"
                  style={{ width: `${currentViewData.data.dayWidth}px` }}
                >
                  <div className="space-x-1 text-11 font-medium text-placeholder">{hourBlock.title}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex h-full w-full flex-grow">
            {hourBlocks.map((hourBlock) => (
              <div
                key={`column-${hourBlock.hour}`}
                data-gantt-today-hour={hourBlock.hour === currentHour ? "true" : undefined}
                className="h-full overflow-hidden outline-[0.25px] outline-subtle"
                style={{ width: `${currentViewData.data.dayWidth}px` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
