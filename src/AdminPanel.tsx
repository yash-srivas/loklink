/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Briefcase, 
  ShieldAlert, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  DollarSign, 
  Check, 
  X, 
  Database,
  ArrowLeft,
  Search,
  UserCheck,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { Button, Card, Badge, Input } from './components/ui';
import { dbService, ExtendedUser, SOSCrises } from './services/dbService';
import { Job, JobStatus } from './types';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function AdminPanel() {
  const navigate = useNavigate();
  
  // Tab State: 'users' | 'jobs' | 'sos' | 'tickets' | 'system'
  const [activeTab, setActiveTab] = useState<'users' | 'jobs' | 'sos' | 'tickets' | 'system'>('users');
  
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sosAlerts, setSosAlerts] = useState<SOSCrises[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWallet, setEditWallet] = useState<number>(0);
  const [editWage, setEditWage] = useState<number>(0);
  const [editCompanyName, setEditCompanyName] = useState('');
  
  // Edit Job State
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editJobWage, setEditJobWage] = useState<number>(0);
  const [editJobStatus, setEditJobStatus] = useState<JobStatus>('open');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const uList = await dbService.getUsers();
      const jList = await dbService.getJobs();
      const sList = await dbService.getSOSRequests();
      const tList = JSON.parse(localStorage.getItem('loklink_tickets') || '[]');
      setUsers(uList);
      setJobs(jList);
      setSosAlerts(sList);
      setTickets(tList);
    } catch (e) {
      toast.error('Failed to load database records.');
    } finally {
      setIsLoading(false);
    }
  };

  // User Mutators
  const handleStartEditUser = (u: ExtendedUser) => {
    setEditingUserId(u.id);
    setEditName(u.name || '');
    setEditPhone(u.phone || '');
    setEditWallet(u.walletBalance || 0);
    setEditWage(u.dailyWage || 500);
    setEditCompanyName(u.companyName || '');
  };

  const handleSaveUser = async (userId: string) => {
    try {
      const u = users.find(x => x.id === userId);
      if (!u) return;

      const updates: Partial<ExtendedUser> = {
        name: editName,
        phone: editPhone,
        walletBalance: Number(editWallet),
      };

      if (u.role === 'worker') {
        updates.dailyWage = Number(editWage);
      } else {
        updates.companyName = editCompanyName;
      }

      await dbService.updateProfile(userId, updates);
      toast.success('User profile updated successfully!');
      setEditingUserId(null);
      loadAllData();
    } catch (e) {
      toast.error('Failed to save profile modifications.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Delete user profile completely from the system?')) {
      try {
        await dbService.deleteUserProfile(userId);
        toast.success('User deleted successfully.');
        loadAllData();
      } catch (e) {
        toast.error('Deletion failed.');
      }
    }
  };

  // Job Mutators
  const handleStartEditJob = (j: Job) => {
    setEditingJobId(j.id);
    setEditJobTitle(j.title);
    setEditJobWage(j.wage);
    setEditJobStatus(j.status);
  };

  const handleSaveJob = async (jobId: string) => {
    try {
      const jobsList = [...jobs];
      const jobIdx = jobsList.findIndex(j => j.id === jobId);
      if (jobIdx === -1) return;

      const job = jobsList[jobIdx];
      job.title = editJobTitle;
      job.wage = Number(editJobWage);
      job.status = editJobStatus;
      
      // Update job status in dbService
      await dbService.updateJobStatus(jobId, editJobStatus);
      
      // Update local storage directly if fallback is active
      const localJobs = JSON.parse(localStorage.getItem('loklink_jobs') || '[]');
      const nextLocal = localJobs.map((j: Job) => j.id === jobId ? { ...j, title: editJobTitle, wage: Number(editJobWage), status: editJobStatus } : j);
      localStorage.setItem('loklink_jobs', JSON.stringify(nextLocal));

      toast.success('Job listing updated!');
      setEditingJobId(null);
      loadAllData();
    } catch (e) {
      toast.error('Failed to modify job.');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (window.confirm('Remove this job post completely?')) {
      try {
        await dbService.deleteJob(jobId);
        toast.success('Job post deleted.');
        loadAllData();
      } catch (e) {
        toast.error('Deletion failed.');
      }
    }
  };

  // SOS Resolvers
  const handleResolveSOS = async (sosId: string) => {
    try {
      await dbService.resolveSOSRequest(sosId);
      toast.success('Emergency crisis resolved!');
      loadAllData();
    } catch (e) {
      toast.error('SOS resolution failed.');
    }
  };

  const handleDeleteSOS = async (sosId: string) => {
    if (window.confirm('Delete this SOS emergency from logs?')) {
      try {
        await dbService.deleteSOSRequest(sosId);
        toast.success('SOS log deleted.');
        loadAllData();
      } catch (e) {
        toast.error('Failed to delete SOS.');
      }
    }
  };

  // Database Reset
  const handleResetSystem = async () => {
    if (window.confirm('DANGER: This will delete ALL users, wallets, SOS reports, and jobs and restore clean initial seeded mock states. Proceed?')) {
      try {
        await dbService.resetDatabase();
        toast.success('Database factory reset successfully completed!');
        loadAllData();
      } catch (e) {
        toast.error('Reset failed.');
      }
    }
  };

  // Filters
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.phone && u.phone.includes(searchQuery)) ||
    (u.role && u.role.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredJobs = jobs.filter(j => 
    j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.skillRequired.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSOS = sosAlerts.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics
  const totalWorkers = users.filter(u => u.role === 'worker').length;
  const totalEmployers = users.filter(u => u.role === 'employer').length;
  const activeSOS = sosAlerts.filter(s => s.status === 'active').length;
  const totalEscrow = jobs.filter(j => j.status === 'accepted' || j.status === 'open').reduce((sum, j) => sum + j.wage, 0);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-24 lg:pb-8 page-enter text-stone-900 dark:text-stone-100">
      
      {/* Admin header */}
      <header className="sticky top-0 z-30 bg-white/72 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200/60 dark:border-stone-800 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full h-10 w-10">
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-xl font-black tracking-tight font-display flex items-center gap-2">
              <Database className="text-orange-500" size={20} />
              <span>LOKLINK Admin Console</span>
            </h1>
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Superuser Database Control Panel</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={loadAllData} disabled={isLoading} className="gap-2 h-9 rounded-xl">
          <RefreshCw className={isLoading ? "animate-spin" : ""} size={14} />
          <span className="hidden sm:inline">Refresh Data</span>
        </Button>
      </header>

      <main className="max-w-6xl mx-auto p-4 pt-6 space-y-6">

        {/* Dashboard Stat Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 flex items-center gap-4 bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800">
            <div className="h-12 w-12 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-600 flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <span className="text-[10px] text-stone-400 font-bold uppercase block">Specialist Workers</span>
              <span className="text-2xl font-black font-display text-stone-900 dark:text-white">{totalWorkers}</span>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-4 bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800">
            <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 flex items-center justify-center">
              <UserCheck size={20} />
            </div>
            <div>
              <span className="text-[10px] text-stone-400 font-bold uppercase block">Active Employers</span>
              <span className="text-2xl font-black font-display text-stone-900 dark:text-white">{totalEmployers}</span>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-4 bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800">
            <div className="h-12 w-12 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 flex items-center justify-center">
              <ShieldAlert className={activeSOS > 0 ? "animate-bounce" : ""} size={20} />
            </div>
            <div>
              <span className="text-[10px] text-stone-400 font-bold uppercase block">Active Emergencies</span>
              <span className={`text-2xl font-black font-display ${activeSOS > 0 ? "text-rose-600" : "text-stone-900 dark:text-white"}`}>{activeSOS}</span>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-4 bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 flex items-center justify-center">
              <Wallet size={20} />
            </div>
            <div>
              <span className="text-[10px] text-stone-400 font-bold uppercase block">Active Escrow Balance</span>
              <span className="text-2xl font-black font-display text-emerald-600">₹{totalEscrow}</span>
            </div>
          </Card>
        </div>

        {/* Tab Pills + Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 p-3 rounded-2xl">
          <div className="flex flex-wrap gap-1 w-full sm:w-auto">
            {[
              { id: 'users', label: 'Users Directory', icon: Users },
              { id: 'jobs', label: 'Jobs Database', icon: Briefcase },
              { id: 'sos', label: 'SOS Alert Logs', icon: ShieldAlert },
              { id: 'tickets', label: 'Support Tickets', icon: ShieldAlert },
              { id: 'system', label: 'System Tools', icon: Database },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setSearchQuery(''); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-stone-450 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400"
                }`}
              >
                <tab.icon size={14} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab !== 'system' && (
            <div className="relative w-full sm:w-64">
              <Input
                placeholder="Quick lookup filter..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 h-9 text-xs rounded-xl"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
            </div>
          )}
        </div>

        {/* Tab Contents */}
        <Card className="bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 rounded-3xl overflow-hidden p-0">
          
          {/* USER DIRECTORY TAB */}
          {activeTab === 'users' && (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs font-medium">
                <thead className="bg-stone-50 dark:bg-stone-850/50 border-b border-stone-200/60 dark:border-stone-800 uppercase tracking-widest text-[9px] font-black text-stone-400">
                  <tr>
                    <th className="px-6 py-4">Profile</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Contact Phone</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Wallet Balance</th>
                    <th className="px-6 py-4">Role Parameters</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {filteredUsers.map(u => {
                    const isEditing = editingUserId === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-stone-50/30 dark:hover:bg-stone-850/10">
                        {/* Name & Avatar */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl overflow-hidden bg-stone-100 border border-stone-200/40">
                              <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                            </div>
                            <div>
                              {isEditing ? (
                                <Input
                                  value={editName}
                                  onChange={e => setEditName(e.target.value)}
                                  className="h-8 text-xs font-bold w-40"
                                />
                              ) : (
                                <span className="font-extrabold text-stone-900 dark:text-white block">{u.name}</span>
                              )}
                              <span className="text-[9px] font-bold text-stone-400 block font-mono">ID: {u.id}</span>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="px-6 py-4">
                          <Badge variant={u.role === 'worker' ? 'warning' : 'success'}>
                            {u.role}
                          </Badge>
                        </td>

                        {/* Phone */}
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <Input
                              value={editPhone}
                              onChange={e => setEditPhone(e.target.value)}
                              className="h-8 text-xs font-bold w-32"
                            />
                          ) : (
                            <span className="font-semibold text-stone-600 dark:text-stone-400 font-mono">{u.phone || 'No Phone'}</span>
                          )}
                        </td>

                        {/* Location */}
                        <td className="px-6 py-4">
                          <span className="font-bold text-stone-550 dark:text-stone-400">{u.area || 'Koramangala'}, {u.city || 'Bengaluru'}</span>
                        </td>

                        {/* Wallet Balance */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <DollarSign size={14} className="text-emerald-500" />
                            {isEditing ? (
                              <Input
                                type="number"
                                value={editWallet}
                                onChange={e => setEditWallet(Number(e.target.value))}
                                className="h-8 text-xs font-black w-24 text-emerald-600"
                              />
                            ) : (
                              <span className="font-extrabold text-emerald-600 text-sm">₹{u.walletBalance ?? 0}</span>
                            )}
                          </div>
                        </td>

                        {/* Custom Parameter block based on role */}
                        <td className="px-6 py-4">
                          {u.role === 'worker' ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-stone-450 uppercase font-black">Wage:</span>
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    value={editWage}
                                    onChange={e => setEditWage(Number(e.target.value))}
                                    className="h-7 text-xs w-20 px-2"
                                  />
                                ) : (
                                  <span className="font-black text-orange-600">₹{u.dailyWage}/Day</span>
                                )}
                              </div>
                              <div className="text-[10px] text-stone-400 font-bold">
                                Exp: {u.experience} Yrs • Rating: {u.rating || 'New'}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-stone-450 uppercase font-black">Company:</span>
                                {isEditing ? (
                                  <Input
                                    value={editCompanyName}
                                    onChange={e => setEditCompanyName(e.target.value)}
                                    className="h-7 text-xs w-36 px-2"
                                  />
                                ) : (
                                  <span className="font-bold text-stone-700 dark:text-stone-300">{u.companyName || 'None'}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {isEditing ? (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleSaveUser(u.id)}
                                  className="h-8 w-8 p-0 rounded-full"
                                >
                                  <Check size={14} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingUserId(null)}
                                  className="h-8 w-8 p-0 rounded-full"
                                >
                                  <X size={14} />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStartEditUser(u)}
                                  className="h-8 w-8 p-0 rounded-full"
                                >
                                  <Edit3 size={13} className="text-stone-500" />
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="h-8 w-8 p-0 rounded-full"
                                >
                                  <Trash2 size={13} />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-stone-400 font-bold">No users match query.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* JOBS DATABASE TAB */}
          {activeTab === 'jobs' && (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs font-medium">
                <thead className="bg-stone-50 dark:bg-stone-850/50 border-b border-stone-200/60 dark:border-stone-800 uppercase tracking-widest text-[9px] font-black text-stone-400">
                  <tr>
                    <th className="px-6 py-4">Job Title & Details</th>
                    <th className="px-6 py-4">Skill Required</th>
                    <th className="px-6 py-4">Locked Wage</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Employer ID</th>
                    <th className="px-6 py-4">Assigned Worker</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {filteredJobs.map(j => {
                    const isEditing = editingJobId === j.id;
                    return (
                      <tr key={j.id} className="hover:bg-stone-50/30 dark:hover:bg-stone-850/10">
                        {/* Title & description */}
                        <td className="px-6 py-4 max-w-sm">
                          {isEditing ? (
                            <Input
                              value={editJobTitle}
                              onChange={e => setEditJobTitle(e.target.value)}
                              className="h-8 text-xs font-bold mb-1 w-full"
                            />
                          ) : (
                            <span className="font-extrabold text-stone-900 dark:text-white block leading-tight mb-1">{j.title}</span>
                          )}
                          <span className="text-[10px] text-stone-450 line-clamp-1 leading-normal">{j.description}</span>
                          <span className="text-[8px] font-mono text-stone-400">ID: {j.id}</span>
                        </td>

                        {/* Skill required */}
                        <td className="px-6 py-4">
                          <Badge variant="warning">{j.skillRequired}</Badge>
                        </td>

                        {/* Locked Wage */}
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editJobWage}
                              onChange={e => setEditJobWage(Number(e.target.value))}
                              className="h-8 text-xs font-black text-orange-600 w-24"
                            />
                          ) : (
                            <span className="font-black text-orange-600 text-sm">₹{j.wage}/Day</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <select
                              value={editJobStatus}
                              onChange={e => setEditJobStatus(e.target.value as any)}
                              className="flex h-8 rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs focus-visible:outline-none dark:bg-stone-800 dark:border-stone-700 font-bold"
                            >
                              <option value="open">open</option>
                              <option value="accepted">accepted</option>
                              <option value="completed">completed</option>
                              <option value="cancelled">cancelled</option>
                            </select>
                          ) : (
                            <Badge variant={
                              j.status === 'open' ? 'default' : 
                              j.status === 'accepted' ? 'warning' : 
                              j.status === 'completed' ? 'success' : 'danger'
                            }>
                              {j.status}
                            </Badge>
                          )}
                        </td>

                        {/* Employer */}
                        <td className="px-6 py-4 font-mono text-[10px] text-stone-450">
                          {j.employerId}
                        </td>

                        {/* Assigned Worker */}
                        <td className="px-6 py-4">
                          {j.workerId ? (
                            <span className="font-extrabold text-stone-600 dark:text-stone-400 font-mono text-[10px]">{j.workerId}</span>
                          ) : (
                            <span className="text-stone-300 dark:text-stone-700 italic">Unassigned</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {isEditing ? (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleSaveJob(j.id)}
                                  className="h-8 w-8 p-0 rounded-full"
                                >
                                  <Check size={14} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingJobId(null)}
                                  className="h-8 w-8 p-0 rounded-full"
                                >
                                  <X size={14} />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStartEditJob(j)}
                                  className="h-8 w-8 p-0 rounded-full"
                                >
                                  <Edit3 size={13} className="text-stone-500" />
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDeleteJob(j.id)}
                                  className="h-8 w-8 p-0 rounded-full"
                                >
                                  <Trash2 size={13} />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredJobs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-stone-400 font-bold">No job posts recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* SOS CRITICAL ALERTS TAB */}
          {activeTab === 'sos' && (
            <div className="p-6 space-y-4">
              <span className="text-[10px] text-stone-400 font-black uppercase tracking-widest block">Active SOS Crisis logs</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSOS.map(sos => (
                  <Card key={sos.id} className={`p-5 border-2 ${sos.status === 'active' ? 'border-red-200 dark:border-red-950/60 bg-red-50/10 dark:bg-red-950/5' : 'border-stone-100 dark:border-stone-800'}`}>
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-red-100/50 flex items-center justify-center text-red-500 border border-red-200/40">
                          <img src={sos.avatar} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-stone-900 dark:text-white leading-tight">{sos.name}</h4>
                          <span className="text-[9px] font-bold text-stone-400 font-mono">ID: {sos.id}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <Badge variant={sos.status === 'active' ? 'danger' : 'success'}>
                          {sos.status}
                        </Badge>
                        <Badge variant={sos.urgency === 'critical' ? 'danger' : 'default'} className="text-[8px] py-0">
                          {sos.urgency}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed font-semibold mb-4 bg-stone-50/60 dark:bg-stone-900/60 p-3 rounded-xl border border-stone-100 dark:border-stone-850">
                      "{sos.description}"
                    </p>

                    <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-stone-100 dark:border-stone-800">
                      <span className="text-stone-400">Location: {sos.location}</span>
                      <div className="flex items-center gap-2">
                        {sos.status === 'active' && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-8 text-[10px] px-3 font-bold"
                            onClick={() => handleResolveSOS(sos.id)}
                          >
                            Resolve Alert
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full"
                          onClick={() => handleDeleteSOS(sos.id)}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}

                {filteredSOS.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-stone-400 font-bold">No active SOS alerts found.</div>
                )}
              </div>
            </div>
          )}

          {/* SYSTEM TOOLS TAB */}
          {activeTab === 'system' && (
            <div className="p-8 max-w-lg mx-auto text-center space-y-6">
              <div className="h-16 w-16 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <Database size={32} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black font-display text-stone-900 dark:text-white">Platform Seeding & Hard-Reset</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  Resetting the database wipes all wallets, job postings, worker specialty listings, and messages and replaces them with a clean set of Firestore collections and LocalStorage profiles.
                </p>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 rounded-2xl text-left space-y-2">
                <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-450 tracking-wider block">⚠️ WARNING FOR DEMONSTRATION ADMINS</span>
                <p className="text-[11px] text-amber-800 dark:text-amber-400 leading-relaxed">
                  If the app is working online, resetting seeds both the active Firebase collections and local caching nodes simultaneously to ensure a fully consistent state.
                </p>
              </div>

              <div className="pt-4 flex gap-3 justify-center">
                <Button variant="danger" size="lg" className="rounded-2xl gap-2 font-bold w-full max-w-xs" onClick={handleResetSystem}>
                  <Trash2 size={18} />
                  <span>Factory Reset Database</span>
                </Button>
              </div>
            </div>
          )}

          {/* SUPPORT TICKETS TAB */}
          {activeTab === 'tickets' && (
            <div className="p-6 space-y-4">
              <span className="text-[10px] text-stone-400 font-black uppercase tracking-widest block font-display">User Support Tickets</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tickets.map(ticket => (
                  <Card key={ticket.id} className={`p-5 border-2 shadow-sm rounded-[24px] ${ticket.status === 'pending' ? 'border-amber-250 bg-amber-50/10 dark:bg-amber-950/5' : 'border-stone-100 dark:border-stone-850 bg-stone-50/20 dark:bg-stone-900/10'}`}>
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div>
                        <h4 className="font-extrabold text-stone-900 dark:text-white leading-tight">{ticket.subject}</h4>
                        <span className="text-[9px] font-bold text-stone-400 block font-mono mt-0.5">Ticket ID: {ticket.id}</span>
                      </div>
                      <Badge variant={ticket.status === 'pending' ? 'warning' : 'success'}>
                        {ticket.status}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed font-semibold mb-4 bg-white dark:bg-stone-900/80 p-3 rounded-xl border border-stone-100 dark:border-stone-850 shadow-inner">
                      {ticket.description}
                    </p>
                    
                    <div className="flex justify-between items-center text-xs font-bold pt-3 border-t border-stone-100 dark:border-stone-800">
                      <div className="flex flex-col text-[10px] text-stone-400">
                        <span>User: {ticket.userName} ({ticket.userId.substring(0, 6)}...)</span>
                        {ticket.userPhone && <span>Phone: {ticket.userPhone}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {ticket.status === 'pending' && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-8 text-[10px] px-3 font-bold"
                            onClick={() => {
                              const updated = tickets.map(t => t.id === ticket.id ? { ...t, status: 'resolved' } : t);
                              localStorage.setItem('loklink_tickets', JSON.stringify(updated));
                              setTickets(updated);
                              toast.success('Ticket marked as Resolved!');
                              window.dispatchEvent(new Event('loklink-db-updated'));
                            }}
                          >
                            Resolve Ticket
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full cursor-pointer"
                          onClick={() => {
                            if (window.confirm('Delete this support ticket permanently?')) {
                              const updated = tickets.filter(t => t.id !== ticket.id);
                              localStorage.setItem('loklink_tickets', JSON.stringify(updated));
                              setTickets(updated);
                              toast.success('Ticket deleted.');
                              window.dispatchEvent(new Event('loklink-db-updated'));
                            }
                          }}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                
                {tickets.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-stone-400 font-bold">No support tickets submitted yet.</div>
                )}
              </div>
            </div>
          )}

        </Card>
      </main>
    </div>
  );
}
