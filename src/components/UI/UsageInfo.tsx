import { useChatStore } from '../../stores/chatStore';

const UsageInfo = () => {
  const currentUsage = useChatStore(state => state.currentUsage);
  const loadingUsage = useChatStore(state => state.loadingUsage);

  if (loadingUsage) {
    return (
      <div className="text-[10px] font-medium px-2 py-1 rounded bg-neutral-200/70 dark:bg-neutral-700/70 text-neutral-700 dark:text-neutral-200">조회중...</div>
    );
  }

  if (!currentUsage) {
    return (
      <div className="usage-info">
        <span className="usage-text">-/-</span>
      </div>
    );
  }

  const { totalPremiumRequests, premiumRequestsUsed } = currentUsage;

  if (premiumRequestsUsed !== undefined && totalPremiumRequests !== undefined) {
    return (
      <div className="text-[10px] font-medium px-2 py-1 rounded bg-neutral-200/70 dark:bg-neutral-700/70 text-neutral-700 dark:text-neutral-200">
        {premiumRequestsUsed}/{totalPremiumRequests}
      </div>
    );
  }

  return (
    <div className="text-[10px] font-medium px-2 py-1 rounded bg-neutral-200/70 dark:bg-neutral-700/70 text-neutral-700 dark:text-neutral-200">-/-</div>
  );
};

export default UsageInfo;