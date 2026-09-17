import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Child, CustomReward, RewardRedemption, AppTheme } from '../types';
import { ChoreIcon } from './ChoreIcon';
import {
  Gift,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Star,
  Check,
  Tv,
  Film,
  IceCream,
  Moon,
  Pizza,
  Trophy,
  Lock,
  Pencil,
  Zap,
} from 'lucide-react';
import { playRewardFanfare } from '../utils/sound';

interface RewardsViewProps {
  child: Child;
  childrenList?: Child[];
  rewards: CustomReward[];
  redemptions: RewardRedemption[];
  currencySymbol: string;
  soundEnabled: boolean;
  isParentMode: boolean;
  onRedeemReward: (rewardId: string) => Promise<void>;
  onResolveRedemption: (redemptionId: string, action: 'approve' | 'reject' | 'fulfill', note?: string) => Promise<void>;
  onAddNewReward: (reward: Omit<CustomReward, 'id'>) => void;
  onUpdateReward?: (reward: CustomReward) => void;
  onDeleteReward: (rewardId: string) => void;
  theme?: AppTheme;
}

export const RewardsView: React.FC<RewardsViewProps> = ({
  child,
  childrenList = [],
  rewards,
  redemptions,
  currencySymbol,
  soundEnabled,
  isParentMode,
  onRedeemReward,
  onResolveRedemption,
  onAddNewReward,
  onUpdateReward,
  onDeleteReward,
  theme = 'classic',
}) => {
  const isFintech = theme === 'fintech_hustle';
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReward, setEditingReward] = useState<CustomReward | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [filterScope, setFilterScope] = useState<'child' | 'all'>('child');

  // New reward form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCost, setNewCost] = useState(100);
  const [newCategory, setNewCategory] = useState('Privilege');
  const [newIcon, setNewIcon] = useState('gift');
  const [newAssignedTo, setNewAssignedTo] = useState<string[]>([]); // empty = all kids

  // Filter redemptions for this child
  const childRedemptions = redemptions.filter((r) => r.childId === child.id);
  const pendingRedemptions = redemptions.filter((r) => r.status === 'pending');

  // Filter rewards: In child mode, only shows rewards assigned to this child or all kids.
  // In Parent mode, allows toggling to view All Family Rewards.
  const displayedRewards = rewards.filter((r) => {
    if (isParentMode && filterScope === 'all') return true;
    if (!r.assignedTo || r.assignedTo.length === 0) return true;
    return r.assignedTo.includes(child.id);
  });

  const handleRedeem = async (reward: CustomReward) => {
    // Strictly prevent claiming another child's reward
    const isAssigned =
      !reward.assignedTo || reward.assignedTo.length === 0 || reward.assignedTo.includes(child.id);
    if (!isAssigned) {
      alert(`This reward is assigned to another child and cannot be claimed by ${child.name}.`);
      return;
    }

    if (child.currentPoints < reward.pointsCost) return;
    setRedeemingId(reward.id);
    playRewardFanfare(soundEnabled);

    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#fbbf24', '#f59e0b', '#6366f1', '#ec4899'],
    });

    await onRedeemReward(reward.id);
    setTimeout(() => {
      setRedeemingId(null);
    }, 600);
  };

  const handleSaveReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddNewReward({
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      pointsCost: Number(newCost) || 50,
      category: newCategory,
      icon: newIcon,
      assignedTo: newAssignedTo.length > 0 ? newAssignedTo : undefined,
    });

    setNewTitle('');
    setNewDesc('');
    setNewCost(100);
    setNewAssignedTo([]);
    setShowAddModal(false);
  };

  return (
    <div id="rewards-view" className="space-y-5">
      {/* Top Spendable Balance Banner */}
      <div
        className={`rounded-3xl p-5 text-white shadow-lg flex items-center justify-between transition-all ${
          isFintech
            ? 'bg-gradient-to-r from-[#0c1424] via-[#0f1f3a] to-[#0c1424] border border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.12)]'
            : 'bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{child.avatar}</span>
            <h3 className="font-extrabold text-base tracking-tight">
              {child.name}'s {isFintech ? 'Vault & Privileges' : 'Rewards Bank'}
            </h3>
            {isFintech && (
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                ⚡ Ready Capital
              </span>
            )}
          </div>
          <p className={`text-xs font-medium ${isFintech ? 'text-slate-400' : 'text-amber-100'}`}>
            {isFintech
              ? 'Liquidate accrued points into custom gear, tech hours, or weekend perks.'
              : 'Earn more points by completing your daily chores!'}
          </p>
        </div>

        <div
          className={`text-right px-3.5 py-2 rounded-2xl border ${
            isFintech
              ? 'bg-[#091322]/80 border-emerald-500/30 backdrop-blur-md'
              : 'bg-black/15 backdrop-blur-md border-white/20'
          }`}
        >
          <div className="flex items-baseline gap-1 justify-end">
            <span className={`text-2xl font-black ${isFintech ? 'text-emerald-400 font-mono' : 'text-white'}`}>
              {child.currentPoints}
            </span>
            <span className={`text-xs font-bold ${isFintech ? 'text-emerald-300' : 'text-amber-200'}`}>
              {currencySymbol}
            </span>
          </div>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider ${
              isFintech ? 'text-slate-400' : 'text-amber-100'
            }`}
          >
            Available
          </span>
        </div>
      </div>

      {/* Parent Actions: Pending Approvals Banner */}
      {pendingRedemptions.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-3xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 animate-spin" />
              <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
                Pending Reward Redemptions ({pendingRedemptions.length})
              </h4>
            </div>
            {!isParentMode && (
              <span className="text-[11px] text-indigo-600 font-medium">
                Switch to Parent Mode to Approve
              </span>
            )}
          </div>

          <div className="space-y-2">
            {pendingRedemptions.map((redemption) => {
              const requestingChild = childrenList.find((c) => c.id === redemption.childId);
              return (
                <div
                  key={redemption.id}
                  className="bg-white p-3 rounded-2xl border border-indigo-100 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      {requestingChild && (
                        <span className="text-[11px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                          <span>{requestingChild.avatar}</span>
                          <span>{requestingChild.name}</span>
                        </span>
                      )}
                      <h5 className="font-bold text-xs text-slate-900">{redemption.rewardTitle}</h5>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Cost: {redemption.pointsSpent} {currencySymbol} • Requested{' '}
                      {new Date(redemption.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {isParentMode ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onResolveRedemption(redemption.id, 'approve', 'Approved by parent!')}
                        className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold active:scale-95 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => onResolveRedemption(redemption.id, 'reject', 'Not approved this time')}
                        className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl active:scale-95"
                        title="Decline & Refund Points"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                      Awaiting Parent
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rewards Catalog Header & Filter Tabs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-sm font-bold ${isFintech ? 'text-white' : 'text-slate-900'}`}>
              {isFintech ? 'Privilege & Reward Marketplace' : 'Custom Rewards Store'}
            </h3>
            <p className={`text-xs ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>
              {isFintech ? 'Redeem hard-earned points for screen time, outings, and cash bounties' : "Pick any reward you've earned enough points for"}
            </p>
          </div>

          {isParentMode && (
            <button
              onClick={() => {
                setNewAssignedTo([child.id]);
                setShowAddModal(true);
              }}
              className={`flex items-center gap-1 active:scale-95 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                isFintech
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Add Reward</span>
            </button>
          )}
        </div>

        {/* Parent Mode: Filter between child's rewards and all family rewards */}
        {isParentMode && childrenList.length > 1 && (
          <div className={`flex items-center gap-1.5 p-1 rounded-2xl w-fit ${isFintech ? 'bg-[#0f1a2e] border border-[#1d2d4c]' : 'bg-slate-100/90'}`}>
            <button
              type="button"
              onClick={() => setFilterScope('child')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                filterScope === 'child'
                  ? isFintech
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'bg-white text-indigo-700 shadow-xs'
                  : isFintech
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{child.avatar}</span>
              <span>{child.name}'s Rewards</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterScope('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                filterScope === 'all'
                  ? isFintech
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'bg-white text-indigo-700 shadow-xs'
                  : isFintech
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>👥</span>
              <span>All Family ({rewards.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {displayedRewards.length === 0 && (
        <div className={`rounded-3xl p-8 text-center border ${isFintech ? 'bg-[#0c1424] border-[#1d2d4c] text-slate-300' : 'bg-white border-slate-200'}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2 text-2xl ${isFintech ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-50 text-amber-500'}`}>
            🎁
          </div>
          <h4 className={`font-bold text-sm ${isFintech ? 'text-white' : 'text-slate-800'}`}>No Rewards Configured for {child.name}</h4>
          <p className={`text-xs mt-1 max-w-xs mx-auto ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>
            {isParentMode
              ? "Tap '+ Add Reward' above to create custom rewards for this child or the whole family."
              : 'Ask a parent to unlock Parent Mode and set up custom rewards!'}
          </p>
        </div>
      )}

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {displayedRewards.map((reward) => {
          // Check if reward can be claimed by current child
          const isAssignedToThisChild =
            !reward.assignedTo || reward.assignedTo.length === 0 || reward.assignedTo.includes(child.id);
          const canAfford = isAssignedToThisChild && child.currentPoints >= reward.pointsCost;
          const needed = Math.max(0, reward.pointsCost - child.currentPoints);
          const percent = Math.min(100, Math.round((child.currentPoints / reward.pointsCost) * 100));

          // Assigned children names/avatars
          const assignedChildren = reward.assignedTo && reward.assignedTo.length > 0
            ? reward.assignedTo
                .map((id) => childrenList.find((c) => c.id === id))
                .filter(Boolean) as Child[]
            : [];

          return (
            <div
              key={reward.id}
              className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                !isAssignedToThisChild
                  ? isFintech
                    ? 'bg-[#091120]/60 border-dashed border-[#1c2d4c] opacity-60'
                    : 'bg-slate-50/80 border-dashed border-slate-200'
                  : canAfford
                  ? isFintech
                    ? 'bg-[#0e172a] border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30'
                    : 'bg-white border-amber-300 shadow-sm ring-1 ring-amber-300/40'
                  : isFintech
                  ? 'bg-[#0b1322] border-[#1a2a46] hover:border-[#263b60]'
                  : 'bg-white border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      !isAssignedToThisChild
                        ? isFintech
                          ? 'bg-[#101b2f] border-[#1d2d4c] text-slate-500'
                          : 'bg-slate-100 border-slate-200 text-slate-400'
                        : isFintech
                        ? 'bg-[#13233f] border-emerald-500/40 text-emerald-400'
                        : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                    }`}
                  >
                    <ChoreIcon name={reward.icon} className="w-5 h-5" />
                  </div>

                  <div className="text-right">
                    <span className={`text-sm font-black flex items-center gap-0.5 justify-end ${isFintech ? 'text-emerald-400 font-mono' : 'text-amber-600'}`}>
                      <Star className={`w-3.5 h-3.5 ${isFintech ? 'text-emerald-400 fill-emerald-400' : 'fill-amber-400 text-amber-500'}`} />
                      {reward.pointsCost}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {reward.category || 'Reward'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <h4 className={`font-bold text-sm leading-snug ${isFintech ? 'text-white' : 'text-slate-900'}`}>{reward.title}</h4>
                  {!isAssignedToThisChild && (
                    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" title="Reserved for another child" />
                  )}
                </div>

                {reward.description && (
                  <p className={`text-xs mt-1 line-clamp-2 ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>{reward.description}</p>
                )}

                {/* Assigned Tag */}
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  {assignedChildren.length > 0 ? (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isAssignedToThisChild
                          ? isFintech
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      <span>{assignedChildren.map((c) => c.avatar).join('')}</span>
                      <span>
                        For {assignedChildren.map((c) => c.name).join(', ')}
                        {!isAssignedToThisChild ? ' Only' : ''}
                      </span>
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      isFintech ? 'bg-[#14233c] text-slate-300 border border-[#203456]' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <span>👥</span>
                      <span>All Kids</span>
                    </span>
                  )}
                </div>
              </div>

              <div className={`mt-4 pt-3 border-t ${isFintech ? 'border-[#1b2b48]' : 'border-slate-100'}`}>
                {/* Progress bar towards reward */}
                {!isAssignedToThisChild ? (
                  <div className="mb-2.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mb-1">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Lock className="w-3 h-3 text-slate-400" />
                        Reserved for {assignedChildren.map((c) => c.name).join(', ')}
                      </span>
                      <span>Locked</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full ${isFintech ? 'bg-slate-800' : 'bg-slate-200'}`} />
                  </div>
                ) : (
                  <div className="mb-2.5">
                    <div className={`flex justify-between text-[10px] font-semibold mb-1 ${isFintech ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span>{canAfford ? 'Ready to claim!' : `Need ${needed} more ${currencySymbol}`}</span>
                      <span className={isFintech ? 'text-emerald-400 font-mono' : ''}>{percent}%</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${isFintech ? 'bg-[#15233c]' : 'bg-slate-100'}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          canAfford ? 'bg-emerald-500' : isFintech ? 'bg-indigo-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Claim Button */}
                <div className="flex items-center gap-2">
                  {!isAssignedToThisChild ? (
                    <div className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed ${
                      isFintech ? 'bg-[#132037] text-slate-500' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Not for {child.name}</span>
                    </div>
                  ) : (
                    <button
                      disabled={!canAfford}
                      onClick={() => handleRedeem(reward)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 ${
                        canAfford
                          ? isFintech
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer'
                            : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer'
                          : isFintech
                          ? 'bg-[#13213a] text-slate-500 cursor-not-allowed'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isFintech ? <Zap className="w-3.5 h-3.5" /> : <Gift className="w-3.5 h-3.5" />}
                      <span>{canAfford ? (isFintech ? 'Claim Privilege' : 'Claim Reward') : (isFintech ? 'In Progress' : 'Keep Earning')}</span>
                    </button>
                  )}

                  {isParentMode && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingReward(reward)}
                        className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-xl transition"
                        title="Edit Reward & Assignment"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteReward(reward.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl transition"
                        title="Delete Reward"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Child's past redemptions history */}
      {childRedemptions.length > 0 && (
        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-2 mt-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            {child.name}'s Reward History
          </h4>

          {childRedemptions.map((red) => (
            <div
              key={red.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs border border-slate-100"
            >
              <div>
                <span className="font-semibold text-slate-800">{red.rewardTitle}</span>
                <span className="text-[10px] text-slate-400 ml-2">
                  {new Date(red.requestedAt).toLocaleDateString()}
                </span>
                {red.parentNote && (
                  <p className="text-[10px] text-indigo-600 italic">"{red.parentNote}"</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-amber-600 font-bold">-{red.pointsSpent} pts</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    red.status === 'approved' || red.status === 'fulfilled'
                      ? 'bg-emerald-100 text-emerald-800'
                      : red.status === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {red.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Parent Add Reward Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3">Add Custom Reward</h3>
            <form onSubmit={handleSaveReward} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Reward Name</label>
                <input
                  type="text"
                  placeholder="e.g. 1 Hour Video Game Pass"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Play Nintendo Switch or PlayStation with friends"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Points Cost</label>
                  <input
                    type="number"
                    min="10"
                    max="5000"
                    step="10"
                    value={newCost}
                    onChange={(e) => setNewCost(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Privilege">Privilege / Screen Time</option>
                    <option value="Treats">Treats & Snacks</option>
                    <option value="Prizes">Toys & Prizes</option>
                    <option value="Entertainment">Outing & Fun</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Reward Icon</label>
                <select
                  value={newIcon}
                  onChange={(e) => setNewIcon(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="gift">🎁 Gift Box</option>
                  <option value="tv">📺 Screen Time</option>
                  <option value="gamepad">🎮 Video Games</option>
                  <option value="film">🎬 Movie</option>
                  <option value="ice-cream">🍦 Ice Cream</option>
                  <option value="pizza">🍕 Pizza Night</option>
                  <option value="moon">🌙 Stay Up Late</option>
                  <option value="trophy">🏆 Special Trip</option>
                  <option value="sparkles">✨ Free Pass</option>
                </select>
              </div>

              {/* Who can claim this reward */}
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">Who can claim this reward?</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAssignedTo([])}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      newAssignedTo.length === 0
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>👥</span>
                    <span>All Children</span>
                  </button>

                  {childrenList.map((ch) => {
                    const isSelected = newAssignedTo.includes(ch.id);
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setNewAssignedTo(newAssignedTo.filter((id) => id !== ch.id));
                          } else {
                            setNewAssignedTo([...newAssignedTo, ch.id]);
                          }
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{ch.avatar}</span>
                        <span>{ch.name} Only</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {newAssignedTo.length === 0
                    ? 'Every child can save points and claim this reward'
                    : `Only ${newAssignedTo
                        .map((id) => childrenList.find((c) => c.id === id)?.name)
                        .filter(Boolean)
                        .join(', ')} will see and be able to claim this`}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-sm"
                >
                  Save Reward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Reward & Assignment Modal */}
      {editingReward && (
        <EditRewardModal
          reward={editingReward}
          childrenList={childrenList}
          onClose={() => setEditingReward(null)}
          onSave={(updated) => {
            if (onUpdateReward) {
              onUpdateReward(updated);
            }
            setEditingReward(null);
          }}
        />
      )}
    </div>
  );
};

interface EditRewardModalProps {
  reward: CustomReward;
  childrenList: Child[];
  onClose: () => void;
  onSave: (reward: CustomReward) => void;
}

const EditRewardModal: React.FC<EditRewardModalProps> = ({
  reward,
  childrenList,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(reward.title);
  const [desc, setDesc] = useState(reward.description || '');
  const [cost, setCost] = useState(reward.pointsCost);
  const [category, setCategory] = useState(reward.category || 'Privilege');
  const [icon, setIcon] = useState(reward.icon || 'gift');
  const [assignedTo, setAssignedTo] = useState<string[]>(reward.assignedTo || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      ...reward,
      title: title.trim(),
      description: desc.trim() || undefined,
      pointsCost: Math.max(1, Number(cost) || 50),
      category,
      icon,
      assignedTo: assignedTo.length > 0 ? assignedTo : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-slate-900 mb-1">Edit Reward & Permissions</h3>
        <p className="text-xs text-slate-500 mb-4">
          Change point cost, details, or restrict which child can claim this reward.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Reward Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Points Cost</label>
              <input
                type="number"
                min="1"
                max="5000"
                step="10"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="Privilege">Privilege / Screen Time</option>
                <option value="Treats">Treats & Snacks</option>
                <option value="Prizes">Toys & Prizes</option>
                <option value="Entertainment">Outing & Fun</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Icon</label>
            <select
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="gift">🎁 Gift Box</option>
              <option value="tv">📺 Screen Time</option>
              <option value="gamepad">🎮 Video Games</option>
              <option value="film">🎬 Movie</option>
              <option value="ice-cream">🍦 Ice Cream</option>
              <option value="pizza">🍕 Pizza Night</option>
              <option value="moon">🌙 Stay Up Late</option>
              <option value="trophy">🏆 Special Trip</option>
              <option value="sparkles">✨ Free Pass</option>
            </select>
          </div>

          {/* Child Assignment Selection */}
          <div>
            <label className="block font-medium text-slate-700 mb-1.5">Who can claim this reward?</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAssignedTo([])}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  assignedTo.length === 0
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>👥</span>
                <span>All Children</span>
              </button>

              {childrenList.map((ch) => {
                const isSelected = assignedTo.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setAssignedTo(assignedTo.filter((id) => id !== ch.id));
                      } else {
                        setAssignedTo([...assignedTo, ch.id]);
                      }
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{ch.avatar}</span>
                    <span>{ch.name} Only</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {assignedTo.length === 0
                ? 'Shared: Any child can save up and claim this.'
                : `Exclusively locked to: ${assignedTo
                    .map((id) => childrenList.find((c) => c.id === id)?.name)
                    .filter(Boolean)
                    .join(', ')}. Sibling children will not be able to claim it.`}
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-sm"
            >
              Update Reward
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
