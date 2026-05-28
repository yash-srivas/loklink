/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'worker' | 'employer';

export type JobStatus = 'open' | 'accepted' | 'worker_completed' | 'completed' | 'cancelled';

export type RequestStatus = 'pending' | 'accepted' | 'rejected';

export type ReviewType = 'worker_review' | 'employer_review';

export interface Location {
  lat?: number;
  lng?: number;
  area: string;
  city: string;
  landmark?: string;
}

export interface User {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
  avatarUrl: string;
  city: string;
  area: string;
  location?: Location;
  language: string;
  createdAt: number;
  updatedAt: number;
  isVerified?: boolean;
  idCardDetails?: any;
  walletBalance?: number;
  
  // Worker-only fields
  skills?: string[];
  experience?: number;
  dailyWage?: number;
  isAvailable?: boolean;
  rating?: number;
  reviewsCount?: number;
  
  // Employer-only fields
  companyName?: string;
  employerRating?: number;
  employerReviewsCount?: number;
}

export interface Job {
  id: string;
  employerId: string;
  workerId: string | null;
  title: string;
  skillRequired: string;
  description: string;
  location: Location;
  wage: number;
  date: string;
  duration: string;
  status: JobStatus;
  createdAt: number;
  titleTranslations?: Record<string, string>;
  descTranslations?: Record<string, string>;
}

export interface JobRequest {
  id: string;
  jobId: string;
  employerId: string;
  workerId: string;
  status: RequestStatus;
  message: string;
  createdAt: number;
  
  // Extra fields for rich display in the list without doing joins
  jobTitle?: string;
  employerName?: string;
  offeredWage?: number;
  dateNeeded?: string;
  area?: string;
}

export interface WorkerReviewRatings {
  punctuality: number; // 1-5
  quality: number; // 1-5
  reliability: number; // 1-5
}

export interface EmployerReviewRatings {
  payment: number; // 1-5
  safety: number; // 1-5
  behavior: number; // 1-5
}

export interface Review {
  id: string;
  jobId: string;
  reviewerId: string;
  revieweeId: string;
  type: ReviewType;
  ratings: WorkerReviewRatings | EmployerReviewRatings;
  overall: number;
  createdAt: number;
  comment?: string;
  
  // Extra helper fields
  reviewerName?: string;
  reviewerAvatar?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'new_request' | 'request_accepted' | 'request_rejected' | 'new_review' | 'system';
  message: string;
  relatedId: string; // jobId, requestId, or reviewId
  isRead: boolean;
  createdAt: number;
}

// Global skill categories for workers
export const WORKER_CATEGORIES = [
  'Electrician',
  'Plumber',
  'Mason',
  'Carpenter',
  'Painter',
  'Domestic Help',
  'Cook',
  'Caretaker',
  'Driver',
  'Loader',
  'Mover',
  'Tailor',
  'Dhobi',
  'Cobbler',
  'Labourer',
  'Pest Control',
  'Repair'
];

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
  { code: 'ml', label: 'മലയാളം (Malayalam)' }
];
