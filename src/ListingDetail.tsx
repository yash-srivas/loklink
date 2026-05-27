/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();

  // Redirect listing detail requests straight to profile page which represents worker profiles in LOKLINK
  if (id) {
    return <Navigate to={`/profile/${id}`} replace />;
  }

  return <Navigate to="/" replace />;
}
