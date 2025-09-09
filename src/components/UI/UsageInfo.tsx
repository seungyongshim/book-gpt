import { useChatStore } from '../../stores/chatStore';

const UsageInfo = () => {
  const currentUsage = useChatStore(state => state.currentUsage);
  const loadingUsage = useChatStore(state => state.loadingUsage);

  if (loadingUsage) {
    return (
      <div className="usage-info">
        <span className="usage-text">조회중...</span>
      </div>
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
      <div className="usage-info">
        <span className="usage-text">
          {premiumRequestsUsed}/{totalPremiumRequests}
        </span>
      </div>
    );
  }

  return (
    <div className="usage-info">
      <span className="usage-text">-/-</span>
    </div>
  );
};

export default UsageInfo;