exports.validateChoices = (req, res, next) => {
  const { choices } = req.body;

  if (!choices || !Array.isArray(choices) || choices.length === 0) {
    return res.status(400).json({ message: "Choices array is required" });
  }

  const seenPairs = new Set();
  const seenOrders = new Set();

  for (let choice of choices) {
    if (!choice.college_id || !choice.branch_id || choice.preference_order == null) {
      return res.status(400).json({ message: "Each choice must have college_id, branch_id, and preference_order" });
    }

    const pairKey = `${choice.college_id}-${choice.branch_id}`;
    if (seenPairs.has(pairKey)) {
      return res.status(400).json({ message: "Duplicate college-branch selections in choices" });
    }

    if (seenOrders.has(choice.preference_order)) {
      return res.status(400).json({ message: "Duplicate preference_order values in choices" });
    }

    seenPairs.add(pairKey);
    seenOrders.add(choice.preference_order);
  }

  next();
};
