/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  db, 
  auth, 
  storage,
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  handleFirestoreError,
  OperationType,
  ref,
  uploadBytesResumable,
  getDownloadURL
} from '../firebase';
import { User, Job, JobRequest, Review, Notification } from '../types';
import { geminiService } from './geminiService';

// Extend User & Job types with wallet/SOS properties safely inside this service
export interface ExtendedUser extends User {
  walletBalance?: number;
}

export interface SOSCrises {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  category: string;
  description: string;
  location: string;
  urgency: 'medium' | 'high' | 'critical';
  createdAt: number;
  status: 'active' | 'helping' | 'resolved';
  helpCount: number;
  helperId?: string;
}

class DbService {
  private usersCollection = 'users';
  private jobsCollection = 'jobs';
  private requestsCollection = 'requests';
  private reviewsCollection = 'reviews';
  private notificationsCollection = 'notifications';

  constructor() {
    this.initLocalStorageDB();
  }

  // ==========================================
  // LOCALSTORAGE DATABASE INITIALIZER
  // ==========================================
  private initLocalStorageDB() {
    if (!localStorage.getItem('loklink_users')) {
      localStorage.setItem('loklink_users', JSON.stringify(this.getMockUsers()));
    }
    if (!localStorage.getItem('loklink_jobs')) {
      localStorage.setItem('loklink_jobs', JSON.stringify(this.getMockJobs()));
    }
    if (!localStorage.getItem('loklink_requests')) {
      localStorage.setItem('loklink_requests', JSON.stringify([]));
    }
    if (!localStorage.getItem('loklink_reviews')) {
      localStorage.setItem('loklink_reviews', JSON.stringify([]));
    }
    if (!localStorage.getItem('loklink_notifications')) {
      localStorage.setItem('loklink_notifications', JSON.stringify([]));
    }
    if (!localStorage.getItem('loklink_sos')) {
      localStorage.setItem('loklink_sos', JSON.stringify(this.getMockSOS()));
    }
  }

  // Helper getters
  private getLocalData<T>(key: string): T[] {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]') as T[];
    } catch {
      return [];
    }
  }

  private setLocalData<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new Event('loklink-db-updated'));
  }

  // ==========================================
  // FILE UPLOAD (FIREBASE STORAGE)
  // ==========================================
  async uploadFile(path: string, file: File, onProgress?: (progress: number) => void): Promise<string> {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size exceeds the 5MB limit.');
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only JPEG, PNG, and WebP images are accepted.');
    }

    try {
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(progress);
          },
          (error) => reject(error),
          async () => {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          }
        );
      });
    } catch (e) {
      console.warn('Storage upload error (Simulating upload fallback):', e);
      return URL.createObjectURL(file);
    }
  }

  // ==========================================
  // USER PROFILES OPERATIONS
  // ==========================================
  async getUserProfile(userId: string): Promise<ExtendedUser | undefined> {
    try {
      const docRef = doc(db, this.usersCollection, userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const u = { id: docSnap.id, ...docSnap.data() } as ExtendedUser;
        if (u.walletBalance === undefined) u.walletBalance = u.role === 'employer' ? 1000 : 0;
        return u;
      }
      return this.getLocalUserProfile(userId);
    } catch (error) {
      return this.getLocalUserProfile(userId);
    }
  }

  private getLocalUserProfile(userId: string): ExtendedUser | undefined {
    const list = this.getLocalData<ExtendedUser>('loklink_users');
    const user = list.find(u => u.id === userId);
    if (user && user.walletBalance === undefined) {
      user.walletBalance = user.role === 'employer' ? 1000 : 0;
    }
    return user;
  }

  async createUserProfile(userId: string, profile: Partial<ExtendedUser>): Promise<ExtendedUser> {
    const newProfile: ExtendedUser = {
      id: userId,
      role: profile.role || 'employer',
      name: profile.name || 'Anonymous User',
      phone: profile.phone || '',
      avatarUrl: profile.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
      city: profile.city || 'Bengaluru',
      area: profile.area || 'Koramangala',
      location: profile.location || { area: profile.area || 'Koramangala', city: profile.city || 'Bengaluru', lat: 12.9352, lng: 77.6245 },
      language: profile.language || 'en',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      
      // Wallet
      walletBalance: profile.role === 'employer' ? 1000 : 0,

      // Worker fields
      skills: profile.skills || [],
      experience: profile.experience || 0,
      dailyWage: profile.dailyWage || 500,
      isAvailable: profile.isAvailable ?? true,
      rating: 0,
      reviewsCount: 0,

      // Employer fields
      companyName: profile.companyName || '',
      employerRating: 0,
      employerReviewsCount: 0
    };

    try {
      await setDoc(doc(db, this.usersCollection, userId), newProfile);
    } catch (error) {
      console.warn('Firestore create profile skipped (Saved in LocalStorage):', error);
    }

    const list = this.getLocalData<ExtendedUser>('loklink_users');
    const filtered = list.filter(u => u.id !== userId);
    this.setLocalData('loklink_users', [...filtered, newProfile]);
    return newProfile;
  }

  async updateProfile(userId: string, updates: Partial<ExtendedUser>): Promise<void> {
    try {
      const docRef = doc(db, this.usersCollection, userId);
      await updateDoc(docRef, { ...updates, updatedAt: Date.now() });
    } catch (error) {
      console.warn('Firestore update profile skipped (Saved in LocalStorage):', error);
    }

    const list = this.getLocalData<ExtendedUser>('loklink_users');
    const updated = list.map(u => {
      if (u.id === userId) {
        return { ...u, ...updates, updatedAt: Date.now() };
      }
      return u;
    });
    this.setLocalData('loklink_users', updated);
  }

  async getWorkers(filters?: { skill?: string; isAvailable?: boolean; city?: string }): Promise<ExtendedUser[]> {
    let workers: ExtendedUser[] = [];
    try {
      let q = query(collection(db, this.usersCollection), where('role', '==', 'worker'));
      const snapshot = await getDocs(q);
      workers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExtendedUser));
    } catch (e) {
      // fallback
    }

    if (workers.length === 0) {
      workers = this.getLocalData<ExtendedUser>('loklink_users').filter(u => u.role === 'worker');
    }

    if (filters?.skill) {
      workers = workers.filter(w => w.skills?.includes(filters.skill!));
    }
    if (filters?.isAvailable !== undefined) {
      workers = workers.filter(w => w.isAvailable === filters.isAvailable);
    }
    if (filters?.city) {
      workers = workers.filter(w => w.city.toLowerCase() === filters.city!.toLowerCase());
    }

    return workers;
  }

  // ==========================================
  // JOBS COLLECTION OPERATIONS
  // ==========================================
  async postJob(job: Omit<Job, 'id' | 'createdAt' | 'status' | 'workerId'>): Promise<Job> {
    // 1. Escrow Deduction: Deduct from employer balance soft-fail-safely
    try {
      const emp = await this.getUserProfile(job.employerId);
      if (emp) {
        const currentBalance = emp.walletBalance ?? 0;
        const nextBalance = Math.max(0, currentBalance - job.wage);
        
        // Update Firestore
        try {
          const docRef = doc(db, this.usersCollection, job.employerId);
          await updateDoc(docRef, { walletBalance: nextBalance, updatedAt: Date.now() });
        } catch (e) {}

        // Update LocalStorage
        const users = this.getLocalData<ExtendedUser>('loklink_users');
        const hasLocal = users.some(u => u.id === job.employerId);
        let updatedUsers: ExtendedUser[];
        if (hasLocal) {
          updatedUsers = users.map(u => {
            if (u.id === job.employerId) {
              return { ...u, walletBalance: nextBalance, updatedAt: Date.now() };
            }
            return u;
          });
        } else {
          updatedUsers = [...users, { ...emp, walletBalance: nextBalance, updatedAt: Date.now() }];
        }
        this.setLocalData('loklink_users', updatedUsers);
      }
    } catch (err) {
      console.warn("Soft escrow deduction failed:", err);
    }

    // Auto-generate translations in en, kn, hi using Gemini
    let titleTranslations: Record<string, string> = { en: job.title };
    let descTranslations: Record<string, string> = { en: job.description };
    try {
      const [knTitle, hiTitle, knDesc, hiDesc] = await Promise.all([
        geminiService.translateText(job.title, 'kn'),
        geminiService.translateText(job.title, 'hi'),
        geminiService.translateText(job.description, 'kn'),
        geminiService.translateText(job.description, 'hi')
      ]);
      titleTranslations.kn = knTitle;
      titleTranslations.hi = hiTitle;
      descTranslations.kn = knDesc;
      descTranslations.hi = hiDesc;
    } catch (e) {
      console.warn("Gemini offline translation skipped during postJob:", e);
    }

    const newJob: Job = {
      ...job,
      id: 'job-' + Math.random().toString(36).substr(2, 9),
      workerId: null,
      status: 'open',
      createdAt: Date.now(),
      titleTranslations,
      descTranslations
    };

    try {
      const docRef = await addDoc(collection(db, this.jobsCollection), newJob);
      newJob.id = docRef.id;
    } catch (e) {
      console.warn('Firestore postJob skipped (Saved in LocalStorage):', e);
    }

    const jobs = this.getLocalData<Job>('loklink_jobs');
    this.setLocalData('loklink_jobs', [newJob, ...jobs]);
    return newJob;
  }

  async updateJobStatus(jobId: string, status: 'open' | 'accepted' | 'worker_completed' | 'completed' | 'cancelled'): Promise<void> {
    try {
      const docRef = doc(db, this.jobsCollection, jobId);
      await updateDoc(docRef, { status });
    } catch (e) {
      console.warn('Firestore updateJobStatus skipped (Saved in LocalStorage):', e);
    }

    const jobs = this.getLocalData<Job>('loklink_jobs');
    const updated = jobs.map(j => {
      if (j.id === jobId) {
        return { ...j, status };
      }
      return j;
    });
    this.setLocalData('loklink_jobs', updated);

    // Escrow payment handler
    if (status === 'completed') {
      const job = jobs.find(j => j.id === jobId);
      if (job && job.workerId) {
        const amount = job.wage;
        
        try {
          // Fetch worker profile securely (resolves Firestore first)
          const workerProfile = await this.getUserProfile(job.workerId);
          if (workerProfile) {
            const currentBalance = workerProfile.walletBalance ?? 0;
            const nextBalance = currentBalance + amount;

            // Update Firestore
            try {
              const docRef = doc(db, this.usersCollection, job.workerId);
              await updateDoc(docRef, { walletBalance: nextBalance, updatedAt: Date.now() });
            } catch (e) {}

            // Update LocalStorage
            const users = this.getLocalData<ExtendedUser>('loklink_users');
            const hasLocal = users.some(u => u.id === job.workerId);
            let updatedUsers: ExtendedUser[];
            if (hasLocal) {
              updatedUsers = users.map(u => {
                if (u.id === job.workerId) {
                  return { ...u, walletBalance: nextBalance, updatedAt: Date.now() };
                }
                return u;
              });
            } else {
              updatedUsers = [...users, { ...workerProfile, walletBalance: nextBalance, updatedAt: Date.now() }];
            }
            this.setLocalData('loklink_users', updatedUsers);
          }
        } catch (err) {
          console.warn("Soft escrow release failed:", err);
        }

        // Notify worker that funds are released!
        await this.sendNotification({
          userId: job.workerId,
          type: 'system',
          message: `Payout released! ₹${amount} has been successfully added to your LOKLINK Pay Wallet.`,
          relatedId: jobId
        });
      }
    }

    // Worker Completed handler: Send real-time notification to employer
    if (status === 'worker_completed') {
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        const workerProfile = this.getLocalUserProfile(job.workerId || '');
        const workerName = workerProfile?.name || 'Worker';
        await this.sendNotification({
          userId: job.employerId,
          type: 'system',
          message: `Worker "${workerName}" has marked the work task "${job.title}" as COMPLETED. Please verify and release payout escrow!`,
          relatedId: jobId
        });
      }
    }
  }

  async acceptJobDirectly(jobId: string, workerId: string, workerName: string): Promise<void> {
    try {
      const jobRef = doc(db, this.jobsCollection, jobId);
      await updateDoc(jobRef, { workerId, status: 'accepted' });
    } catch (e) {
      console.warn('Firestore acceptJobDirectly skipped (Saved in LocalStorage):', e);
    }

    const jobs = this.getLocalData<Job>('loklink_jobs');
    const updated = jobs.map(j => {
      if (j.id === jobId) {
        return { ...j, workerId, status: 'accepted' as const };
      }
      return j;
    });
    this.setLocalData('loklink_jobs', updated);

    const targetJob = jobs.find(j => j.id === jobId);
    if (targetJob) {
      await this.sendNotification({
        userId: targetJob.employerId,
        type: 'request_accepted',
        message: `Worker "${workerName}" has accepted your open job listing: "${targetJob.title}"`,
        relatedId: jobId
      });
    }
  }

  async getJobs(filters?: { employerId?: string; workerId?: string; status?: string }): Promise<Job[]> {
    let jobs: Job[] = [];
    try {
      let q = query(collection(db, this.jobsCollection), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
    } catch (e) {
      // fallback
    }

    if (jobs.length === 0) {
      jobs = this.getLocalData<Job>('loklink_jobs');
    }

    if (filters?.employerId) {
      jobs = jobs.filter(j => j.employerId === filters.employerId);
    }
    if (filters?.workerId) {
      jobs = jobs.filter(j => j.workerId === filters.workerId);
    }
    if (filters?.status) {
      jobs = jobs.filter(j => j.status === filters.status);
    }

    return jobs;
  }

  subscribeToEmployerJobs(employerId: string, callback: (jobs: Job[]) => void) {
    const handleUpdate = () => {
      callback(this.getLocalData<Job>('loklink_jobs').filter(j => j.employerId === employerId));
    };

    window.addEventListener('loklink-db-updated', handleUpdate);

    let unsub = () => {};
    try {
      const q = query(
        collection(db, this.jobsCollection),
        where('employerId', '==', employerId),
        orderBy('createdAt', 'desc')
      );
      const fsUnsub = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
        callback(list.length > 0 ? list : this.getLocalData<Job>('loklink_jobs').filter(j => j.employerId === employerId));
      }, () => {
        handleUpdate();
      });
      unsub = () => {
        fsUnsub();
        window.removeEventListener('loklink-db-updated', handleUpdate);
      };
    } catch (e) {
      handleUpdate();
      unsub = () => {
        window.removeEventListener('loklink-db-updated', handleUpdate);
      };
    }
    return unsub;
  }

  // ==========================================
  // REQUESTS COLLECTION OPERATIONS
  // ==========================================
  async sendJobRequest(request: Omit<JobRequest, 'id' | 'createdAt' | 'status'>): Promise<JobRequest> {
    const newRequest: JobRequest = {
      ...request,
      id: 'req-' + Math.random().toString(36).substr(2, 9),
      status: 'pending',
      createdAt: Date.now()
    };

    try {
      const docRef = await addDoc(collection(db, this.requestsCollection), newRequest);
      newRequest.id = docRef.id;
    } catch (e) {
      console.warn('Firestore sendJobRequest skipped (Saved in LocalStorage):', e);
    }

    const requests = this.getLocalData<JobRequest>('loklink_requests');
    this.setLocalData('loklink_requests', [newRequest, ...requests]);

    // Create notification for worker
    await this.sendNotification({
      userId: request.workerId,
      type: 'new_request',
      message: `New job offer received: "${request.jobTitle || 'General Helper'}"`,
      relatedId: newRequest.id
    });

    return newRequest;
  }

  subscribeToWorkerRequests(workerId: string, callback: (requests: JobRequest[]) => void) {
    const handleUpdate = () => {
      callback(this.getLocalData<JobRequest>('loklink_requests').filter(r => r.workerId === workerId && r.status === 'pending'));
    };

    window.addEventListener('loklink-db-updated', handleUpdate);

    let unsub = () => {};
    try {
      const q = query(
        collection(db, this.requestsCollection),
        where('workerId', '==', workerId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      const fsUnsub = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobRequest));
        callback(list.length > 0 ? list : this.getLocalData<JobRequest>('loklink_requests').filter(r => r.workerId === workerId && r.status === 'pending'));
      }, () => {
        handleUpdate();
      });
      unsub = () => {
        fsUnsub();
        window.removeEventListener('loklink-db-updated', handleUpdate);
      };
    } catch (e) {
      handleUpdate();
      unsub = () => {
        window.removeEventListener('loklink-db-updated', handleUpdate);
      };
    }
    return unsub;
  }

  async updateRequestStatus(requestId: string, status: 'accepted' | 'rejected'): Promise<void> {
    try {
      const reqRef = doc(db, this.requestsCollection, requestId);
      await updateDoc(reqRef, { status });
    } catch (e) {
      console.warn('Firestore updateRequestStatus skipped (Saved in LocalStorage):', e);
    }

    const reqs = this.getLocalData<JobRequest>('loklink_requests');
    const updatedReqs = reqs.map(r => {
      if (r.id === requestId) {
        return { ...r, status };
      }
      return r;
    });
    this.setLocalData('loklink_requests', updatedReqs);

    const targetReq = reqs.find(r => r.id === requestId);
    if (targetReq) {
      // Notify employer
      await this.sendNotification({
        userId: targetReq.employerId,
        type: status === 'accepted' ? 'request_accepted' : 'request_rejected',
        message: `Worker has ${status} your job offer for "${targetReq.jobTitle || 'Helper'}"`,
        relatedId: targetReq.jobId
      });

      if (status === 'accepted') {
        // Bind worker to job, and mark job as accepted
        const jobs = this.getLocalData<Job>('loklink_jobs');
        const updatedJobs = jobs.map(j => {
          if (j.id === targetReq.jobId) {
            return { ...j, workerId: targetReq.workerId, status: 'accepted' as const };
          }
          return j;
        });
        this.setLocalData('loklink_jobs', updatedJobs);

        try {
          const jobRef = doc(db, this.jobsCollection, targetReq.jobId);
          await updateDoc(jobRef, { workerId: targetReq.workerId, status: 'accepted' });
        } catch (e) {}
      }
    }
  }

  // ==========================================
  // REVIEWS COLLECTION & RATINGS
  // ==========================================
  async addReview(review: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
    let reviewerName = 'Community Member';
    let reviewerAvatar = '';
    try {
      const revProfile = this.getLocalUserProfile(review.reviewerId);
      if (revProfile) {
        reviewerName = revProfile.name;
        reviewerAvatar = revProfile.avatarUrl;
      }
    } catch (e) {}

    const newReview: Review = {
      ...review,
      id: 'rev-' + Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      reviewerName,
      reviewerAvatar
    };

    try {
      const docRef = await addDoc(collection(db, this.reviewsCollection), newReview);
      newReview.id = docRef.id;
    } catch (e) {
      console.warn('Firestore addReview skipped (Saved in LocalStorage):', e);
    }

    const reviews = this.getLocalData<Review>('loklink_reviews');
    this.setLocalData('loklink_reviews', [newReview, ...reviews]);

    // Update rating count local
    const users = this.getLocalData<ExtendedUser>('loklink_users');
    const updatedUsers = users.map(u => {
      if (u.id === review.revieweeId) {
        if (review.type === 'worker_review') {
          const count = u.reviewsCount || 0;
          const currentRating = u.rating || 0;
          const nextCount = count + 1;
          const nextRating = Number(((currentRating * count) + review.overall) / nextCount).toFixed(1);
          return { ...u, rating: parseFloat(nextRating), reviewsCount: nextCount };
        } else {
          const count = u.employerReviewsCount || 0;
          const currentRating = u.employerRating || 0;
          const nextCount = count + 1;
          const nextRating = Number(((currentRating * count) + review.overall) / nextCount).toFixed(1);
          return { ...u, employerRating: parseFloat(nextRating), employerReviewsCount: nextCount };
        }
      }
      return u;
    });
    this.setLocalData('loklink_users', updatedUsers);

    // Notify reviewed person
    await this.sendNotification({
      userId: review.revieweeId,
      type: 'new_review',
      message: `You received a new rating of ${review.overall} stars for your recent job.`,
      relatedId: review.jobId
    });

    return newReview;
  }

  async getReviews(revieweeId: string): Promise<Review[]> {
    let reviews: Review[] = [];
    try {
      const q = query(
        collection(db, this.reviewsCollection),
        where('revieweeId', '==', revieweeId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
    } catch (e) {}

    if (reviews.length === 0) {
      reviews = this.getLocalData<Review>('loklink_reviews').filter(r => r.revieweeId === revieweeId);
    }

    return reviews;
  }

  async getReviewsWrittenBy(reviewerId: string): Promise<Review[]> {
    let reviews: Review[] = [];
    try {
      const q = query(
        collection(db, this.reviewsCollection),
        where('reviewerId', '==', reviewerId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
    } catch (e) {}

    if (reviews.length === 0) {
      reviews = this.getLocalData<Review>('loklink_reviews').filter(r => r.reviewerId === reviewerId);
    }

    return reviews;
  }

  // ==========================================
  // NOTIFICATIONS COLLECTION OPERATIONS
  // ==========================================
  async sendNotification(notif: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<Notification> {
    const newNotif: Notification = {
      ...notif,
      id: 'notif-' + Math.random().toString(36).substr(2, 9),
      isRead: false,
      createdAt: Date.now()
    };

    try {
      const docRef = await addDoc(collection(db, this.notificationsCollection), newNotif);
      newNotif.id = docRef.id;
    } catch (e) {
      console.warn('Firestore sendNotification skipped (Saved in LocalStorage):', e);
    }

    const list = this.getLocalData<Notification>('loklink_notifications');
    this.setLocalData('loklink_notifications', [newNotif, ...list]);
    return newNotif;
  }

  subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void) {
    const handleUpdate = () => {
      callback(this.getLocalData<Notification>('loklink_notifications').filter(n => n.userId === userId));
    };

    window.addEventListener('loklink-db-updated', handleUpdate);

    let unsub = () => {};
    try {
      const q = query(
        collection(db, this.notificationsCollection),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const fsUnsub = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        callback(list.length > 0 ? list : this.getLocalData<Notification>('loklink_notifications').filter(n => n.userId === userId));
      }, () => {
        handleUpdate();
      });
      unsub = () => {
        fsUnsub();
        window.removeEventListener('loklink-db-updated', handleUpdate);
      };
    } catch (e) {
      handleUpdate();
      unsub = () => {
        window.removeEventListener('loklink-db-updated', handleUpdate);
      };
    }
    return unsub;
  }

  async markNotificationRead(id: string): Promise<void> {
    try {
      const ref = doc(db, this.notificationsCollection, id);
      await updateDoc(ref, { isRead: true });
    } catch (e) {}

    const list = this.getLocalData<Notification>('loklink_notifications');
    const updated = list.map(n => {
      if (n.id === id) {
        return { ...n, isRead: true };
      }
      return n;
    });
    this.setLocalData('loklink_notifications', updated);
  }

  // ==========================================
  // SOS OPERATIONS
  // ==========================================
  async getSOSRequests(): Promise<SOSCrises[]> {
    try {
      const snap = await getDocs(query(collection(db, 'sos'), orderBy('createdAt', 'desc')));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SOSCrises));
      if (list.length > 0) return list;
    } catch (e) {
      console.warn('Firestore getSOSRequests failed, falling back to LocalStorage:', e);
    }
    return this.getLocalData<SOSCrises>('loklink_sos');
  }

  async postSOSRequest(sos: Omit<SOSCrises, 'id' | 'createdAt' | 'status' | 'helpCount'>): Promise<SOSCrises> {
    const newSos: SOSCrises = {
      ...sos,
      id: 'sos-' + Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      status: 'active',
      helpCount: 0
    };

    try {
      await setDoc(doc(db, 'sos', newSos.id), newSos);
    } catch (e) {
      console.warn('Firestore postSOSRequest failed, falling back to LocalStorage:', e);
    }

    const list = this.getLocalData<SOSCrises>('loklink_sos');
    this.setLocalData('loklink_sos', [newSos, ...list]);

    // Send notification to nearby workers
    const workers = await this.getWorkers();
    await Promise.all(workers.slice(0, 3).map(w => 
      this.sendNotification({
        userId: w.id,
        type: 'system',
        message: `CRITICAL: SOS emergency near you! Plumber needed at ${sos.location}`,
        relatedId: newSos.id
      })
    ));

    return newSos;
  }

  async resolveSOSRequest(sosId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'sos', sosId), { status: 'resolved' });
    } catch (e) {
      console.warn('Firestore resolveSOSRequest failed, falling back to LocalStorage:', e);
    }

    const list = this.getLocalData<SOSCrises>('loklink_sos');
    const sos = list.find(s => s.id === sosId);
    
    if (sos && sos.helperId) {
      await this.loadMockFunds(sos.helperId, 50);
      await this.sendNotification({
        userId: sos.helperId,
        type: 'system',
        message: `Payout of ₹50 credited for successfully resolving local SOS emergency!`,
        relatedId: sosId
      });
    }

    const updated = list.map(item => {
      if (item.id === sosId) {
        return { ...item, status: 'resolved' as const };
      }
      return item;
    });
    this.setLocalData('loklink_sos', updated);
  }

  async acceptSOSRequest(sosId: string, helperId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'sos', sosId), { status: 'helping', helperId });
    } catch (e) {
      console.warn('Firestore acceptSOSRequest failed, falling back to LocalStorage:', e);
    }

    const list = this.getLocalData<SOSCrises>('loklink_sos');
    const updated = list.map(item => {
      if (item.id === sosId) {
        return { ...item, status: 'helping' as const, helperId, helpCount: item.helpCount + 1 };
      }
      return item;
    });
    this.setLocalData('loklink_sos', updated);
  }

  async incrementSOSHelp(sosId: string): Promise<void> {
    const list = this.getLocalData<SOSCrises>('loklink_sos');
    const item = list.find(i => i.id === sosId);
    const nextHelpCount = (item?.helpCount || 0) + 1;

    try {
      await updateDoc(doc(db, 'sos', sosId), { helpCount: nextHelpCount });
    } catch (e) {
      console.warn('Firestore incrementSOSHelp failed, falling back to LocalStorage:', e);
    }

    const updated = list.map(item => {
      if (item.id === sosId) {
        return { ...item, helpCount: nextHelpCount };
      }
      return item;
    });
    this.setLocalData('loklink_sos', updated);
  }

  // ==========================================
  // ADMIN PLATFORM MANAGEMENT METHODS
  // ==========================================
  async getUsers(): Promise<ExtendedUser[]> {
    let users: ExtendedUser[] = [];
    try {
      const snapshot = await getDocs(collection(db, this.usersCollection));
      users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExtendedUser));
    } catch (e) {
      // fallback
    }

    if (users.length === 0) {
      users = this.getLocalData<ExtendedUser>('loklink_users');
    }
    return users;
  }

  async deleteUserProfile(userId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.usersCollection, userId));
    } catch (e) {}
    const list = this.getLocalData<ExtendedUser>('loklink_users');
    this.setLocalData('loklink_users', list.filter(u => u.id !== userId));
  }

  async deleteJob(jobId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.jobsCollection, jobId));
    } catch (e) {}
    const list = this.getLocalData<Job>('loklink_jobs');
    this.setLocalData('loklink_jobs', list.filter(j => j.id !== jobId));
  }

  async deleteSOSRequest(sosId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'sos', sosId));
    } catch (e) {}
    const list = this.getLocalData<SOSCrises>('loklink_sos');
    this.setLocalData('loklink_sos', list.filter(s => s.id !== sosId));
  }

  async resetDatabase(): Promise<void> {
    // 1. Clear LocalStorage
    localStorage.removeItem('loklink_users');
    localStorage.removeItem('loklink_jobs');
    localStorage.removeItem('loklink_requests');
    localStorage.removeItem('loklink_reviews');
    localStorage.removeItem('loklink_notifications');
    localStorage.removeItem('loklink_sos');
    
    // 2. Re-initialize LocalStorage fallback
    this.initLocalStorageDB();

    // 3. Reset Firestore collections if possible
    try {
      const mockUsers = this.getMockUsers();
      for (const u of mockUsers) {
        await setDoc(doc(db, this.usersCollection, u.id), u);
      }
      const mockJobs = this.getMockJobs();
      for (const j of mockJobs) {
        await setDoc(doc(db, this.jobsCollection, j.id), j);
      }
      const mockSOS = this.getMockSOS();
      for (const s of mockSOS) {
        await setDoc(doc(db, 'sos', s.id), s);
      }
    } catch (e) {
      console.warn("Firestore reset skipped:", e);
    }
  }


  async seedFirestoreIfEmpty(): Promise<void> {
    try {
      // 1. Seed users if empty
      const usersSnap = await getDocs(query(collection(db, this.usersCollection), limit(1)));
      if (usersSnap.empty) {
        console.log("Seeding users in Firestore...");
        const mockUsers = this.getMockUsers();
        for (const u of mockUsers) {
          await setDoc(doc(db, this.usersCollection, u.id), u);
        }
      }

      // 2. Seed jobs if empty
      const jobsSnap = await getDocs(query(collection(db, this.jobsCollection), limit(1)));
      if (jobsSnap.empty) {
        console.log("Seeding jobs in Firestore...");
        const mockJobs = this.getMockJobs();
        for (const j of mockJobs) {
          await setDoc(doc(db, this.jobsCollection, j.id), j);
        }
      }

      // 3. Seed SOS if empty
      const sosSnap = await getDocs(query(collection(db, 'sos'), limit(1)));
      if (sosSnap.empty) {
        console.log("Seeding SOS in Firestore...");
        const mockSOS = this.getMockSOS();
        for (const s of mockSOS) {
          await setDoc(doc(db, 'sos', s.id), s);
        }
      }
    } catch (err) {
      console.warn("Firestore database seeding skipped or blocked by rules/offline status:", err);
    }
  }

  // ==========================================
  // WALLET OPERATIONS
  // ==========================================
  async loadMockFunds(userId: string, amount: number): Promise<number> {
    // 1. Fetch current profile securely (checks Firestore first, then LocalStorage)
    const profile = await this.getUserProfile(userId);
    const currentBalance = profile ? (profile.walletBalance || 0) : 0;
    const nextBalance = currentBalance + amount;

    // 2. Try updating Firestore
    try {
      const docRef = doc(db, this.usersCollection, userId);
      await updateDoc(docRef, { walletBalance: nextBalance, updatedAt: Date.now() });
    } catch (error) {
      console.warn('Firestore loadMockFunds skipped:', error);
    }

    // 3. Update LocalStorage
    const users = this.getLocalData<ExtendedUser>('loklink_users');
    const hasLocal = users.some(u => u.id === userId);
    
    let updated: ExtendedUser[];
    if (hasLocal) {
      updated = users.map(u => {
        if (u.id === userId) {
          return { ...u, walletBalance: nextBalance, updatedAt: Date.now() };
        }
        return u;
      });
    } else if (profile) {
      updated = [...users, { ...profile, walletBalance: nextBalance, updatedAt: Date.now() }];
    } else {
      updated = users;
    }
    
    this.setLocalData('loklink_users', updated);
    return nextBalance;
  }

  // ==========================================
  // MOCK SEED GENERATORS FOR TESTING
  // ==========================================
  private getMockUsers(): ExtendedUser[] {
    return [
      // ── Original Bengaluru users ──
      {
        id: 'mock-w-1',
        role: 'worker',
        name: 'Manjunath Swamy',
        phone: '9876543210',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Manjunath',
        city: 'Hubballi',
        area: 'Vidyanagar',
        location: { area: 'Vidyanagar', city: 'Hubballi', lat: 15.3647, lng: 75.1240 },
        language: 'en',
        createdAt: Date.now() - 100000,
        updatedAt: Date.now() - 100000,
        skills: ['Electrician', 'Repair'],
        experience: 10,
        dailyWage: 650,
        isAvailable: true,
        rating: 4.8,
        reviewsCount: 14,
        walletBalance: 1200
      },
      {
        id: 'mock-w-2',
        role: 'worker',
        name: 'Ramesh Naik',
        phone: '9876543211',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Ramesh',
        city: 'Hubballi',
        area: 'Deshpande Nagar',
        location: { area: 'Deshpande Nagar', city: 'Hubballi', lat: 15.3590, lng: 75.1320 },
        language: 'hi',
        createdAt: Date.now() - 200000,
        updatedAt: Date.now() - 200000,
        skills: ['Carpenter'],
        experience: 8,
        dailyWage: 800,
        isAvailable: true,
        rating: 4.6,
        reviewsCount: 8,
        walletBalance: 0
      },
      {
        id: 'mock-w-3',
        role: 'worker',
        name: 'Sita Bai',
        phone: '9876543212',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sita',
        city: 'Hubballi',
        area: 'Keshwapur',
        location: { area: 'Keshwapur', city: 'Hubballi', lat: 15.3730, lng: 75.1180 },
        language: 'kn',
        createdAt: Date.now() - 300000,
        updatedAt: Date.now() - 300000,
        skills: ['Domestic Help', 'Cook'],
        experience: 5,
        dailyWage: 450,
        isAvailable: true,
        rating: 4.9,
        reviewsCount: 22,
        walletBalance: 450
      },
      {
        id: 'mock-emp-1',
        role: 'employer',
        name: 'Rahul Khanna',
        phone: '9988776655',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Rahul',
        city: 'Hubballi',
        area: 'Gokul Road',
        location: { area: 'Gokul Road', city: 'Hubballi', lat: 15.3700, lng: 75.1350 },
        language: 'en',
        createdAt: Date.now() - 400000,
        updatedAt: Date.now() - 400000,
        companyName: 'Khanna Residency',
        employerRating: 4.7,
        employerReviewsCount: 5,
        walletBalance: 5000
      },
      // ── Hubbali Workers ──
      {
        id: 'hub-w-1',
        role: 'worker',
        name: 'Basavaraj Patil',
        phone: '9845012301',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Basavaraj',
        city: 'Hubballi',
        area: 'Gokul Road',
        location: { area: 'Gokul Road', city: 'Hubballi', lat: 15.3710, lng: 75.1345 },
        language: 'kn',
        createdAt: Date.now() - 500000,
        updatedAt: Date.now() - 500000,
        skills: ['Plumber'],
        experience: 12,
        dailyWage: 700,
        isAvailable: true,
        rating: 4.7,
        reviewsCount: 19,
        walletBalance: 800
      },
      {
        id: 'hub-w-2',
        role: 'worker',
        name: 'Shankar Gowda',
        phone: '9845012302',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Shankar',
        city: 'Hubballi',
        area: 'Old Hubballi',
        location: { area: 'Old Hubballi', city: 'Hubballi', lat: 15.3520, lng: 75.1400 },
        language: 'kn',
        createdAt: Date.now() - 600000,
        updatedAt: Date.now() - 600000,
        skills: ['Mason', 'Labourer'],
        experience: 15,
        dailyWage: 850,
        isAvailable: true,
        rating: 4.5,
        reviewsCount: 11,
        walletBalance: 300
      },
      {
        id: 'hub-w-3',
        role: 'worker',
        name: 'Lakshmi Devi',
        phone: '9845012303',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Lakshmi',
        city: 'Hubballi',
        area: 'Navanagar',
        location: { area: 'Navanagar', city: 'Hubballi', lat: 15.3800, lng: 75.1100 },
        language: 'kn',
        createdAt: Date.now() - 700000,
        updatedAt: Date.now() - 700000,
        skills: ['Cook', 'Domestic Help'],
        experience: 7,
        dailyWage: 500,
        isAvailable: true,
        rating: 4.8,
        reviewsCount: 16,
        walletBalance: 600
      },
      {
        id: 'hub-w-4',
        role: 'worker',
        name: 'Venkatesh Hegde',
        phone: '9845012304',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Venkatesh',
        city: 'Hubballi',
        area: 'Unkal',
        location: { area: 'Unkal', city: 'Hubballi', lat: 15.3900, lng: 75.1050 },
        language: 'kn',
        createdAt: Date.now() - 800000,
        updatedAt: Date.now() - 800000,
        skills: ['Painter'],
        experience: 6,
        dailyWage: 600,
        isAvailable: true,
        rating: 4.4,
        reviewsCount: 7,
        walletBalance: 150
      },
      {
        id: 'hub-w-5',
        role: 'worker',
        name: 'Irfan Ahmed',
        phone: '9845012305',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Irfan',
        city: 'Hubballi',
        area: 'CBT Area',
        location: { area: 'CBT Area', city: 'Hubballi', lat: 15.3550, lng: 75.1250 },
        language: 'hi',
        createdAt: Date.now() - 900000,
        updatedAt: Date.now() - 900000,
        skills: ['Driver'],
        experience: 9,
        dailyWage: 750,
        isAvailable: true,
        rating: 4.6,
        reviewsCount: 13,
        walletBalance: 400
      },
      {
        id: 'hub-w-6',
        role: 'worker',
        name: 'Suresh Kumar',
        phone: '9845012306',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Suresh',
        city: 'Hubballi',
        area: 'Shirur Park',
        location: { area: 'Shirur Park', city: 'Hubballi', lat: 15.3580, lng: 75.1150 },
        language: 'hi',
        createdAt: Date.now() - 1000000,
        updatedAt: Date.now() - 1000000,
        skills: ['Tailor'],
        experience: 20,
        dailyWage: 550,
        isAvailable: true,
        rating: 4.9,
        reviewsCount: 31,
        walletBalance: 1100
      },
      {
        id: 'hub-w-7',
        role: 'worker',
        name: 'Nagraj Meti',
        phone: '9845012307',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Nagraj',
        city: 'Hubballi',
        area: 'Vidyanagar',
        location: { area: 'Vidyanagar', city: 'Hubballi', lat: 15.3660, lng: 75.1260 },
        language: 'kn',
        createdAt: Date.now() - 1100000,
        updatedAt: Date.now() - 1100000,
        skills: ['Loader', 'Mover'],
        experience: 4,
        dailyWage: 500,
        isAvailable: true,
        rating: 4.3,
        reviewsCount: 5,
        walletBalance: 200
      },
      {
        id: 'hub-w-8',
        role: 'worker',
        name: 'Ravi Bhajantri',
        phone: '9845012308',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Ravi',
        city: 'Hubballi',
        area: 'Deshpande Nagar',
        location: { area: 'Deshpande Nagar', city: 'Hubballi', lat: 15.3605, lng: 75.1310 },
        language: 'kn',
        createdAt: Date.now() - 1200000,
        updatedAt: Date.now() - 1200000,
        skills: ['Pest Control'],
        experience: 3,
        dailyWage: 600,
        isAvailable: true,
        rating: 4.2,
        reviewsCount: 4,
        walletBalance: 100
      },
      {
        id: 'hub-w-9',
        role: 'worker',
        name: 'Mahadevi Angadi',
        phone: '9845012309',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Mahadevi',
        city: 'Hubballi',
        area: 'Keshwapur',
        location: { area: 'Keshwapur', city: 'Hubballi', lat: 15.3745, lng: 75.1195 },
        language: 'kn',
        createdAt: Date.now() - 1300000,
        updatedAt: Date.now() - 1300000,
        skills: ['Caretaker'],
        experience: 8,
        dailyWage: 400,
        isAvailable: true,
        rating: 4.7,
        reviewsCount: 10,
        walletBalance: 350
      },
      {
        id: 'hub-w-10',
        role: 'worker',
        name: 'Yunus Savanur',
        phone: '9845012310',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Yunus',
        city: 'Hubballi',
        area: 'Navanagar',
        location: { area: 'Navanagar', city: 'Hubballi', lat: 15.3815, lng: 75.1080 },
        language: 'hi',
        createdAt: Date.now() - 1400000,
        updatedAt: Date.now() - 1400000,
        skills: ['Cobbler', 'Repair'],
        experience: 11,
        dailyWage: 450,
        isAvailable: true,
        rating: 4.5,
        reviewsCount: 9,
        walletBalance: 250
      },
      {
        id: 'hub-w-11',
        role: 'worker',
        name: 'Pradeep Kulkarni',
        phone: '9845012311',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Pradeep',
        city: 'Hubballi',
        area: 'Unkal',
        location: { area: 'Unkal', city: 'Hubballi', lat: 15.3880, lng: 75.1020 },
        language: 'kn',
        createdAt: Date.now() - 1500000,
        updatedAt: Date.now() - 1500000,
        skills: ['Electrician', 'Repair'],
        experience: 14,
        dailyWage: 750,
        isAvailable: true,
        rating: 4.8,
        reviewsCount: 25,
        walletBalance: 900
      },
      {
        id: 'hub-w-12',
        role: 'worker',
        name: 'Deepa Hiremath',
        phone: '9845012312',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Deepa',
        city: 'Hubballi',
        area: 'Gokul Road',
        location: { area: 'Gokul Road', city: 'Hubballi', lat: 15.3690, lng: 75.1370 },
        language: 'kn',
        createdAt: Date.now() - 1600000,
        updatedAt: Date.now() - 1600000,
        skills: ['Dhobi'],
        experience: 6,
        dailyWage: 400,
        isAvailable: true,
        rating: 4.6,
        reviewsCount: 12,
        walletBalance: 500
      },
      // ── Hubbali Employers ──
      {
        id: 'hub-emp-1',
        role: 'employer',
        name: 'Anand Desai',
        phone: '9845099901',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Anand',
        city: 'Hubballi',
        area: 'Vidyanagar',
        location: { area: 'Vidyanagar', city: 'Hubballi', lat: 15.3640, lng: 75.1235 },
        language: 'en',
        createdAt: Date.now() - 1700000,
        updatedAt: Date.now() - 1700000,
        companyName: 'Desai Constructions',
        employerRating: 4.6,
        employerReviewsCount: 8,
        walletBalance: 8000
      },
      {
        id: 'hub-emp-2',
        role: 'employer',
        name: 'Meena Joshi',
        phone: '9845099902',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Meena',
        city: 'Hubballi',
        area: 'Navanagar',
        location: { area: 'Navanagar', city: 'Hubballi', lat: 15.3790, lng: 75.1120 },
        language: 'kn',
        createdAt: Date.now() - 1800000,
        updatedAt: Date.now() - 1800000,
        companyName: 'Joshi Household',
        employerRating: 4.8,
        employerReviewsCount: 3,
        walletBalance: 3000
      }
    ];
  }

  private getMockJobs(): Job[] {
    return [
      {
        id: 'mock-job-1',
        employerId: 'mock-emp-1',
        workerId: null,
        title: 'Emergency Wiring Fix',
        skillRequired: 'Electrician',
        description: 'Need an experienced electrician to inspect a short-circuit in the living room and wire up a newly installed smart ceiling fan.',
        location: { area: 'Gokul Road', city: 'Hubballi', lat: 15.3700, lng: 75.1350 },
        wage: 700,
        date: '2026-05-27',
        duration: '1 Day',
        status: 'open',
        createdAt: Date.now() - 500000
      },
      {
        id: 'mock-job-2',
        employerId: 'mock-emp-1',
        workerId: 'mock-w-1',
        title: 'House Cleaning Task',
        skillRequired: 'Domestic Help',
        description: 'Deep dusting and bathroom vacuuming required for a 3BHK flat.',
        location: { area: 'Gokul Road', city: 'Hubballi', lat: 15.3705, lng: 75.1355 },
        wage: 500,
        date: '2026-05-26',
        duration: 'Half Day',
        status: 'accepted',
        createdAt: Date.now() - 800000
      },
      // ── Hubbali Open Jobs ──
      {
        id: 'hub-job-1',
        employerId: 'hub-emp-1',
        workerId: null,
        title: 'Bathroom Pipeline Repair',
        skillRequired: 'Plumber',
        description: 'Leaking pipe under the bathroom sink. Need urgent fix before it causes water damage to the floor tiles.',
        location: { area: 'Vidyanagar', city: 'Hubballi', lat: 15.3650, lng: 75.1245 },
        wage: 600,
        date: '2026-05-28',
        duration: 'Half Day',
        status: 'open',
        createdAt: Date.now() - 200000
      },
      {
        id: 'hub-job-2',
        employerId: 'hub-emp-1',
        workerId: null,
        title: 'New House Wall Construction',
        skillRequired: 'Mason',
        description: 'Build a 10ft compound wall around the backyard. Materials will be provided on site.',
        location: { area: 'Vidyanagar', city: 'Hubballi', lat: 15.3645, lng: 75.1230 },
        wage: 1200,
        date: '2026-05-29',
        duration: '3 Days',
        status: 'open',
        createdAt: Date.now() - 300000
      },
      {
        id: 'hub-job-3',
        employerId: 'hub-emp-2',
        workerId: null,
        title: 'Full House Deep Cleaning',
        skillRequired: 'Domestic Help',
        description: 'Need thorough cleaning of a 4BHK house including kitchen, bathrooms, and balcony. Cleaning supplies provided.',
        location: { area: 'Navanagar', city: 'Hubballi', lat: 15.3795, lng: 75.1115 },
        wage: 800,
        date: '2026-05-28',
        duration: '1 Day',
        status: 'open',
        createdAt: Date.now() - 250000
      },
      {
        id: 'hub-job-4',
        employerId: 'hub-emp-2',
        workerId: null,
        title: 'Kitchen Cabinet Repair',
        skillRequired: 'Carpenter',
        description: 'Two kitchen cabinet doors are broken and hinges need replacement. Wood material will be provided.',
        location: { area: 'Navanagar', city: 'Hubballi', lat: 15.3805, lng: 75.1095 },
        wage: 650,
        date: '2026-05-27',
        duration: 'Half Day',
        status: 'open',
        createdAt: Date.now() - 180000
      },
      {
        id: 'hub-job-5',
        employerId: 'mock-emp-1',
        workerId: null,
        title: 'Office Room Painting',
        skillRequired: 'Painter',
        description: 'Paint 2 office rooms (approx 400 sqft each) with Asian Paints Royale. Paint cans provided.',
        location: { area: 'Deshpande Nagar', city: 'Hubballi', lat: 15.3595, lng: 75.1315 },
        wage: 1500,
        date: '2026-05-30',
        duration: '2 Days',
        status: 'open',
        createdAt: Date.now() - 150000
      },
      {
        id: 'hub-job-6',
        employerId: 'hub-emp-1',
        workerId: null,
        title: 'Airport Drop & Pickup',
        skillRequired: 'Driver',
        description: 'Need a driver for Hubballi airport drop at 6 AM and pickup at 9 PM same day. Car provided.',
        location: { area: 'Gokul Road', city: 'Hubballi', lat: 15.3715, lng: 75.1340 },
        wage: 900,
        date: '2026-05-28',
        duration: '1 Day',
        status: 'open',
        createdAt: Date.now() - 120000
      },
      {
        id: 'hub-job-7',
        employerId: 'hub-emp-2',
        workerId: null,
        title: 'Wedding Cooking Help',
        skillRequired: 'Cook',
        description: 'Need experienced cook to prepare meals for 50 guests. North Karnataka style food preferred.',
        location: { area: 'Keshwapur', city: 'Hubballi', lat: 15.3740, lng: 75.1185 },
        wage: 1000,
        date: '2026-05-31',
        duration: '1 Day',
        status: 'open',
        createdAt: Date.now() - 100000
      },
      {
        id: 'hub-job-8',
        employerId: 'mock-emp-1',
        workerId: null,
        title: 'Furniture Shifting Help',
        skillRequired: 'Loader',
        description: 'Need 2 helpers to shift furniture from 2nd floor to ground floor in the same building.',
        location: { area: 'Old Hubballi', city: 'Hubballi', lat: 15.3525, lng: 75.1405 },
        wage: 500,
        date: '2026-05-27',
        duration: 'Half Day',
        status: 'open',
        createdAt: Date.now() - 80000
      },
      {
        id: 'hub-job-9',
        employerId: 'hub-emp-1',
        workerId: null,
        title: 'Cockroach & Ant Treatment',
        skillRequired: 'Pest Control',
        description: 'Full pest control spray needed for a 3BHK flat. Focus on kitchen and bathroom areas.',
        location: { area: 'Shirur Park', city: 'Hubballi', lat: 15.3585, lng: 75.1155 },
        wage: 550,
        date: '2026-05-29',
        duration: 'Half Day',
        status: 'open',
        createdAt: Date.now() - 60000
      },
      {
        id: 'hub-job-10',
        employerId: 'hub-emp-2',
        workerId: null,
        title: 'Elderly Care Assistant',
        skillRequired: 'Caretaker',
        description: 'Daily caretaker needed for an elderly person. Duties include medicine reminders, walks, and meal assistance.',
        location: { area: 'Unkal', city: 'Hubballi', lat: 15.3895, lng: 75.1045 },
        wage: 600,
        date: '2026-05-28',
        duration: 'Full Day',
        status: 'open',
        createdAt: Date.now() - 40000
      }
    ];
  }

  private getMockSOS(): SOSCrises[] {
    return [
      {
        id: 'sos-1',
        userId: 'mock-emp-1',
        name: 'Rahul Khanna',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul',
        category: 'Plumber',
        description: 'Main water line burst in the kitchen. Need help ASAP to stop the flooding!',
        location: 'Gokul Road, Hubballi',
        urgency: 'critical',
        createdAt: Date.now() - 1000 * 60 * 15,
        status: 'active',
        helpCount: 2
      },
      {
        id: 'sos-2',
        userId: 'hub-emp-1',
        name: 'Anand Desai',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anand',
        category: 'Electrician',
        description: 'Short circuit in the main board. Half the house has no power and smelling smoke.',
        location: 'Vidyanagar, Hubballi',
        urgency: 'high',
        createdAt: Date.now() - 1000 * 60 * 45,
        status: 'active',
        helpCount: 0
      },
      {
        id: 'sos-3',
        userId: 'hub-emp-2',
        name: 'Meena Joshi',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Meena',
        category: 'Mason',
        description: 'Compound wall collapsed due to rain. Need emergency repair to secure the property.',
        location: 'Navanagar, Hubballi',
        urgency: 'high',
        createdAt: Date.now() - 1000 * 60 * 30,
        status: 'active',
        helpCount: 1
      }
    ];
  }
}

export const dbService = new DbService();
export default dbService;

