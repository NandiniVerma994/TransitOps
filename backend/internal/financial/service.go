package financial

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"
)

var (
	ErrValidation = errors.New("validation failed")
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) VehicleOptions(ctx context.Context) ([]Option, error) {
	vehicles, err := s.repo.ListVehicleRefs(ctx)
	if err != nil {
		return nil, err
	}

	options := make([]Option, 0, len(vehicles))
	for _, vehicle := range vehicles {
		label := vehicle.RegistrationNo
		if vehicle.Model != "" {
			label += " - " + vehicle.Model
		}
		options = append(options, Option{Value: vehicle.ID, Label: label})
	}

	return options, nil
}

func (s *Service) TripOptions(ctx context.Context) ([]Option, error) {
	return s.repo.ListTripOptions(ctx)
}

func (s *Service) FuelLogs(ctx context.Context, search string) ([]FuelLog, error) {
	rows, err := s.repo.ListFuelLogs(ctx, search)
	if err != nil {
		return nil, err
	}

	for i := range rows {
		enrichFuelLog(&rows[i])
	}

	return rows, nil
}

func (s *Service) LogFuel(ctx context.Context, req LogFuelRequest, userID string) (FuelLog, error) {
	req.VehicleID = strings.TrimSpace(req.VehicleID)
	req.TripID = strings.TrimSpace(req.TripID)
	if req.VehicleID == "" {
		return FuelLog{}, fmt.Errorf("%w: vehicle is required", ErrValidation)
	}
	if req.Liters <= 0 {
		return FuelLog{}, fmt.Errorf("%w: liters must be greater than zero", ErrValidation)
	}
	if req.TotalCost <= 0 {
		return FuelLog{}, fmt.Errorf("%w: total cost must be greater than zero", ErrValidation)
	}
	if req.Odometer < 0 {
		return FuelLog{}, fmt.Errorf("%w: odometer cannot be negative", ErrValidation)
	}
	if req.Date.IsZero() {
		req.Date = time.Now()
	}

	prevOdometer, err := s.repo.PreviousOdometer(ctx, req.VehicleID)
	if err != nil {
		return FuelLog{}, err
	}
	if req.Odometer < prevOdometer {
		return FuelLog{}, fmt.Errorf("%w: odometer cannot be lower than previous reading", ErrValidation)
	}

	id, err := s.repo.CreateFuelLog(ctx, req, userID, prevOdometer)
	if err != nil {
		return FuelLog{}, err
	}

	rows, err := s.repo.ListFuelLogs(ctx, id)
	if err != nil {
		return FuelLog{}, err
	}
	if len(rows) == 0 {
		return FuelLog{}, nil
	}
	enrichFuelLog(&rows[0])
	return rows[0], nil
}

func (s *Service) FuelSummary(ctx context.Context) ([]KPIItem, error) {
	rows, err := s.FuelLogs(ctx, "")
	if err != nil {
		return nil, err
	}

	var totalExpenditure, totalLiters, efficiencySum float64
	var efficiencyCount int
	for _, row := range rows {
		totalExpenditure += row.TotalCost
		totalLiters += row.Liters
		if row.Efficiency != nil {
			efficiencySum += *row.Efficiency
			efficiencyCount++
		}
	}

	avgEfficiency := 0.0
	if efficiencyCount > 0 {
		avgEfficiency = efficiencySum / float64(efficiencyCount)
	}
	avgPricePerLiter := 0.0
	if totalLiters > 0 {
		avgPricePerLiter = totalExpenditure / totalLiters
	}

	return []KPIItem{
		{Label: "Total Fuel Expenditure", Value: totalExpenditure, Icon: "expenses"},
		{Label: "Total Liters Consumed", Value: fmt.Sprintf("%.0f L", totalLiters), Icon: "efficiency"},
		{Label: "Avg. Fuel Efficiency", Value: fmt.Sprintf("%.1f km/L", avgEfficiency), Icon: "revenue"},
		{Label: "Avg. Price / Liter", Value: avgPricePerLiter, Icon: "profit"},
	}, nil
}

func (s *Service) Expenses(ctx context.Context, search, expenseType string, from, to time.Time) ([]Expense, error) {
	return s.repo.ListExpenses(ctx, search, expenseType, from, to)
}

func (s *Service) LogExpense(ctx context.Context, req LogExpenseRequest, userID string) (Expense, error) {
	req.VehicleID = strings.TrimSpace(req.VehicleID)
	req.TripID = strings.TrimSpace(req.TripID)
	req.Type = strings.TrimSpace(req.Type)
	req.Note = strings.TrimSpace(req.Note)

	if req.VehicleID == "" {
		return Expense{}, fmt.Errorf("%w: vehicle is required", ErrValidation)
	}
	if !validExpenseType(req.Type) {
		return Expense{}, fmt.Errorf("%w: invalid expense type", ErrValidation)
	}
	if req.Amount <= 0 {
		return Expense{}, fmt.Errorf("%w: amount must be greater than zero", ErrValidation)
	}
	if req.Note == "" {
		return Expense{}, fmt.Errorf("%w: note is required", ErrValidation)
	}

	id, err := s.repo.CreateExpense(ctx, req, userID)
	if err != nil {
		return Expense{}, err
	}

	rows, err := s.repo.ListExpenses(ctx, id, "", time.Time{}, time.Time{})
	if err != nil {
		return Expense{}, err
	}
	if len(rows) == 0 {
		return Expense{}, nil
	}
	return rows[0], nil
}

func (s *Service) MaintenanceLogs(ctx context.Context, search, status string) ([]MaintenanceCost, error) {
	return s.repo.ListMaintenanceCosts(ctx, search, status)
}

func (s *Service) MaintenanceSummary(ctx context.Context) (MaintenanceSummary, error) {
	rows, err := s.MaintenanceLogs(ctx, "", "")
	if err != nil {
		return MaintenanceSummary{}, err
	}

	var summary MaintenanceSummary
	summary.Rows = rows
	var downtimeTotal float64
	var downtimeCount int
	for _, row := range rows {
		summary.TotalCost += row.Cost
		if row.Category == "Corrective" {
			summary.Corrective += row.Cost
		} else {
			summary.Preventive += row.Cost
		}
		if row.Status == "Closed" && row.ClosedAt != nil {
			summary.AvgDowntime += row.ClosedAt.Sub(row.StartedAt).Hours() / 24
			downtimeTotal = summary.AvgDowntime
			downtimeCount++
		}
	}
	if downtimeCount > 0 {
		summary.AvgDowntime = downtimeTotal / float64(downtimeCount)
	}

	return summary, nil
}

func (s *Service) ROIAnalysis(ctx context.Context) ([]VehicleROI, error) {
	vehicles, err := s.repo.ListVehicleRefs(ctx)
	if err != nil {
		return nil, err
	}
	fuelRows, err := s.FuelLogs(ctx, "")
	if err != nil {
		return nil, err
	}
	expenses, err := s.Expenses(ctx, "", "", time.Time{}, time.Time{})
	if err != nil {
		return nil, err
	}
	maintenanceRows, err := s.MaintenanceLogs(ctx, "", "")
	if err != nil {
		return nil, err
	}
	revenueByVehicle, err := s.repo.TripRevenueByVehicle(ctx)
	if err != nil {
		return nil, err
	}

	totals := totalsByVehicle(vehicles, fuelRows, expenses, maintenanceRows)
	rows := make([]VehicleROI, 0, len(vehicles))
	for _, vehicle := range vehicles {
		t := totals[vehicle.RegistrationNo]
		tripRevenue := revenueByVehicle[vehicle.RegistrationNo]
		netProfit := tripRevenue - (t.fuel + t.maintenance + t.other)
		var roi *float64
		if vehicle.AcquisitionCost > 0 {
			value := (netProfit / vehicle.AcquisitionCost) * 100
			roi = &value
		}

		rows = append(rows, VehicleROI{
			VehicleID:       vehicle.RegistrationNo,
			Model:           vehicle.Model,
			Type:            vehicle.Type,
			Status:          vehicle.Status,
			AcquisitionCost: vehicle.AcquisitionCost,
			TripRevenue:     tripRevenue,
			FuelCost:        t.fuel,
			MaintenanceCost: t.maintenance,
			OtherExpenses:   t.other,
			NetProfit:       netProfit,
			ROI:             roi,
		})
	}

	return rows, nil
}

func (s *Service) FuelExpenseSummary(ctx context.Context) (FuelExpenseSummary, error) {
	fuelRows, err := s.FuelLogs(ctx, "")
	if err != nil {
		return FuelExpenseSummary{}, err
	}
	expenses, err := s.Expenses(ctx, "", "", time.Time{}, time.Time{})
	if err != nil {
		return FuelExpenseSummary{}, err
	}
	maintenanceRows, err := s.MaintenanceLogs(ctx, "", "")
	if err != nil {
		return FuelExpenseSummary{}, err
	}

	var summary FuelExpenseSummary
	for _, row := range fuelRows {
		summary.TotalFuelCost += row.TotalCost
	}
	for _, row := range expenses {
		summary.TotalOtherExpenses += row.Amount
	}
	for _, row := range maintenanceRows {
		summary.TotalMaintenance += row.Cost
	}
	summary.TotalOperationalCost = summary.TotalFuelCost + summary.TotalOtherExpenses + summary.TotalMaintenance

	return summary, nil
}

func (s *Service) DashboardSummary(ctx context.Context) (DashboardSummary, error) {
	vehicles, err := s.repo.ListVehicleRefs(ctx)
	if err != nil {
		return DashboardSummary{}, err
	}
	fuelRows, err := s.FuelLogs(ctx, "")
	if err != nil {
		return DashboardSummary{}, err
	}
	expenses, err := s.Expenses(ctx, "", "", time.Time{}, time.Time{})
	if err != nil {
		return DashboardSummary{}, err
	}
	maintenanceRows, err := s.MaintenanceLogs(ctx, "", "")
	if err != nil {
		return DashboardSummary{}, err
	}
	revenueByVehicle, err := s.repo.TripRevenueByVehicle(ctx)
	if err != nil {
		return DashboardSummary{}, err
	}
	monthly, err := s.repo.MonthlyRevenueExpense(ctx)
	if err != nil {
		return DashboardSummary{}, err
	}

	totals := totalsByVehicle(vehicles, fuelRows, expenses, maintenanceRows)
	totalRevenue := sumRevenue(revenueByVehicle)
	totalFuel, totalMaintenance, totalOther := sumCostTotals(totals)
	totalOperationalCost := totalFuel + totalMaintenance + totalOther
	netProfit := totalRevenue - totalOperationalCost
	netMargin := 0.0
	if totalRevenue > 0 {
		netMargin = (netProfit / totalRevenue) * 100
	}

	totalDistance := 0.0
	for _, row := range fuelRows {
		totalDistance += row.Odometer - row.PrevOdometer
	}
	costPerKm := 0.0
	if totalDistance > 0 {
		costPerKm = totalOperationalCost / totalDistance
	}

	return DashboardSummary{
		KPIs: []KPIItem{
			{Label: "Total Revenue", Value: totalRevenue, ChangePercent: 0, Icon: "revenue"},
			{Label: "Total Operational Cost", Value: totalOperationalCost, ChangePercent: 0, Icon: "expenses"},
			{Label: "Net Profit", Value: netProfit, ChangePercent: netMargin, Icon: "profit"},
			{Label: "Avg. Cost / Km", Value: costPerKm, ChangePercent: 0, Icon: "efficiency"},
		},
		RevenueExpenseData:      monthly,
		MonthlyExpenseTrendData: expenseTrend(monthly),
		ExpenseBreakdownData:    expenseBreakdown(totalFuel, totalMaintenance, expenses),
		CostIntensiveVehicles:   costIntensiveVehicles(totals),
		NetMargin:               netMargin,
	}, nil
}

func (s *Service) AnalyticsSummary(ctx context.Context) (AnalyticsSummary, error) {
	vehicles, err := s.repo.ListVehicleRefs(ctx)
	if err != nil {
		return AnalyticsSummary{}, err
	}
	fuelRows, err := s.FuelLogs(ctx, "")
	if err != nil {
		return AnalyticsSummary{}, err
	}
	fuelExpenseSummary, err := s.FuelExpenseSummary(ctx)
	if err != nil {
		return AnalyticsSummary{}, err
	}
	roiRows, err := s.ROIAnalysis(ctx)
	if err != nil {
		return AnalyticsSummary{}, err
	}
	monthly, err := s.repo.MonthlyRevenueExpense(ctx)
	if err != nil {
		return AnalyticsSummary{}, err
	}
	expenses, err := s.Expenses(ctx, "", "", time.Time{}, time.Time{})
	if err != nil {
		return AnalyticsSummary{}, err
	}
	maintenanceRows, err := s.MaintenanceLogs(ctx, "", "")
	if err != nil {
		return AnalyticsSummary{}, err
	}

	var efficiencySum float64
	var efficiencyCount int
	for _, row := range fuelRows {
		if row.Efficiency != nil {
			efficiencySum += *row.Efficiency
			efficiencyCount++
		}
	}
	avgEfficiency := 0.0
	if efficiencyCount > 0 {
		avgEfficiency = efficiencySum / float64(efficiencyCount)
	}

	busyVehicles := 0
	for _, vehicle := range vehicles {
		if vehicle.Status == "On Trip" || vehicle.Status == "In Shop" {
			busyVehicles++
		}
	}
	fleetUtilization := 0.0
	if len(vehicles) > 0 {
		fleetUtilization = (float64(busyVehicles) / float64(len(vehicles))) * 100
	}

	var roiSum float64
	var roiCount int
	for _, row := range roiRows {
		if row.ROI != nil {
			roiSum += *row.ROI
			roiCount++
		}
	}
	avgROI := 0.0
	if roiCount > 0 {
		avgROI = roiSum / float64(roiCount)
	}

	totals := totalsByVehicle(vehicles, fuelRows, expenses, maintenanceRows)
	monthlyRevenue := make([]PeriodValue, 0, len(monthly))
	for _, row := range monthly {
		monthlyRevenue = append(monthlyRevenue, PeriodValue{Period: row.Period, Revenue: row.Revenue})
	}

	return AnalyticsSummary{
		KPIs: AnalyticsKPIs{
			FuelEfficiency:   avgEfficiency,
			FleetUtilization: fleetUtilization,
			OperationalCost:  fuelExpenseSummary.TotalOperationalCost,
			VehicleROI:       avgROI,
		},
		MonthlyRevenueData:    monthlyRevenue,
		CostIntensiveVehicles: costIntensiveVehicles(totals),
		ROIRows:               roiRows,
	}, nil
}

type costTotals struct {
	fuel        float64
	maintenance float64
	other       float64
}

func totalsByVehicle(vehicles []VehicleRef, fuelRows []FuelLog, expenses []Expense, maintenanceRows []MaintenanceCost) map[string]costTotals {
	totals := make(map[string]costTotals, len(vehicles))
	for _, vehicle := range vehicles {
		totals[vehicle.RegistrationNo] = costTotals{}
	}
	for _, row := range fuelRows {
		t := totals[row.VehicleID]
		t.fuel += row.TotalCost
		totals[row.VehicleID] = t
	}
	for _, row := range expenses {
		t := totals[row.VehicleID]
		t.other += row.Amount
		totals[row.VehicleID] = t
	}
	for _, row := range maintenanceRows {
		t := totals[row.VehicleID]
		t.maintenance += row.Cost
		totals[row.VehicleID] = t
	}
	return totals
}

func enrichFuelLog(row *FuelLog) {
	if row.Liters > 0 {
		price := row.TotalCost / row.Liters
		row.PricePerLiter = &price
		efficiency := (row.Odometer - row.PrevOdometer) / row.Liters
		if efficiency >= 0 {
			row.Efficiency = &efficiency
		}
	}
	if row.Vehicle != nil {
		if baseline, ok := fuelBaseline(row.Vehicle.Type); ok {
			row.Baseline = &baseline
			if row.Efficiency != nil {
				row.IsOutlier = *row.Efficiency < baseline*0.75
			}
		}
	}
}

func fuelBaseline(vehicleType string) (float64, bool) {
	switch strings.ToLower(strings.TrimSpace(vehicleType)) {
	case "van":
		return 12.5, true
	case "truck", "heavy truck":
		return 6.8, true
	case "mini", "mini truck":
		return 9.2, true
	case "sedan":
		return 16.5, true
	default:
		return 0, false
	}
}

func validExpenseType(expenseType string) bool {
	switch expenseType {
	case "Fuel", "Maintenance", "Toll", "Permit", "Fine", "Other":
		return true
	default:
		return false
	}
}

func maintenanceCategory(title, description string) string {
	text := strings.ToLower(title + " " + description)
	if strings.Contains(text, "repair") || strings.Contains(text, "replace") || strings.Contains(text, "brake") || strings.Contains(text, "clutch") {
		return "Corrective"
	}
	return "Preventive"
}

func sumRevenue(revenueByVehicle map[string]float64) float64 {
	total := 0.0
	for _, amount := range revenueByVehicle {
		total += amount
	}
	return total
}

func sumCostTotals(totals map[string]costTotals) (float64, float64, float64) {
	var fuel, maintenance, other float64
	for _, total := range totals {
		fuel += total.fuel
		maintenance += total.maintenance
		other += total.other
	}
	return fuel, maintenance, other
}

func expenseTrend(rows []PeriodValue) []PeriodValue {
	trend := make([]PeriodValue, 0, len(rows))
	for _, row := range rows {
		trend = append(trend, PeriodValue{Month: row.Period, Expense: row.Expenses})
	}
	return trend
}

func expenseBreakdown(totalFuel, totalMaintenance float64, expenses []Expense) []NameValue {
	values := map[string]float64{
		"Fuel":        totalFuel,
		"Maintenance": totalMaintenance,
	}
	for _, expense := range expenses {
		values[expense.Type] += expense.Amount
	}

	order := []string{"Fuel", "Maintenance", "Toll", "Permit", "Fine", "Other"}
	breakdown := make([]NameValue, 0, len(order))
	for _, name := range order {
		if values[name] > 0 {
			breakdown = append(breakdown, NameValue{Name: name, Value: values[name]})
		}
	}
	return breakdown
}

func costIntensiveVehicles(totals map[string]costTotals) []CostVehicle {
	rows := make([]CostVehicle, 0, len(totals))
	for vehicleID, total := range totals {
		rows = append(rows, CostVehicle{Name: vehicleID, Cost: total.fuel + total.maintenance + total.other})
	}
	sort.Slice(rows, func(i, j int) bool {
		return rows[i].Cost > rows[j].Cost
	})
	if len(rows) > 5 {
		rows = rows[:5]
	}
	return rows
}
