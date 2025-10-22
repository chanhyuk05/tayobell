import { createBrowserRouter } from "react-router-dom";

import { BISOnboardPage, BISServicePage, SIServicePage } from "@/pages";

export const router = createBrowserRouter([
  {
    path: "/bis",
    element: <BISOnboardPage />,
  },
  {
    path: "/bis/:stationId",
    element: <BISServicePage />,
  },
  {
    path: "/sis/:stationId/:busId",
    element: <SIServicePage />,
  },
]);
