/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ChartDataType } from "@plane/types";

export interface IHourBlock {
  hour: number;
  title: string;
}

const formatHour = (hour: number) => `${hour.toString().padStart(2, "0")}:00`;

const generateDayChart = (dayPayload: ChartDataType, _side: null | "left" | "right", targetDate?: Date) => {
  const currentDate = targetDate ?? dayPayload.data.currentDate;
  const startDate = new Date(currentDate);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setHours(23, 59, 59, 999);

  const payload: IHourBlock[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    title: formatHour(hour),
  }));

  return {
    state: {
      ...dayPayload,
      data: {
        ...dayPayload.data,
        currentDate,
        startDate,
        endDate,
      },
    },
    payload,
    scrollWidth: payload.length * dayPayload.data.dayWidth,
  };
};

const mergeDayRenderPayloads = (a: IHourBlock[]) => a;

export const dayView = {
  generateChart: generateDayChart,
  mergeRenderPayloads: mergeDayRenderPayloads,
};
