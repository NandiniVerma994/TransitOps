package financial

import "time"

type VehicleRef struct {
	ID              string  `json:"id"`
	RegistrationNo  string  `json:"registrationNumber"`
	Model           string  `json:"model"`
	Type            string  `json:"type"`
	AcquisitionCost float64 `json:"acquisitionCost"`
	Status          string  `json:"status"`
}

type Option struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

type FuelLog struct {
	ID            string      `json:"id"`
	VehicleID     string      `json:"vehicleId"`
	Date          time.Time   `json:"date"`
	Liters        float64     `json:"liters"`
	TotalCost     float64     `json:"totalCost"`
	TripID        string      `json:"tripId,omitempty"`
	Odometer      float64     `json:"odometer"`
	PrevOdometer  float64     `json:"prevOdometer"`
	Vehicle       *VehicleRef `json:"vehicle,omitempty"`
	PricePerLiter *float64    `json:"pricePerLiter"`
	Efficiency    *float64    `json:"efficiency"`
	Baseline      *float64    `json:"baseline"`
	IsOutlier     bool        `json:"isOutlier"`
}

type LogFuelRequest struct {
	VehicleID string    `json:"vehicle_id"`
	TripID    string    `json:"trip_id"`
	Liters    float64   `json:"liters"`
	TotalCost float64   `json:"total_cost"`
	Date      time.Time `json:"date"`
	Odometer  float64   `json:"odometer"`
}

type Expense struct {
	ID        string      `json:"id"`
	Date      time.Time   `json:"date"`
	Type      string      `json:"type"`
	VehicleID string      `json:"vehicleId,omitempty"`
	TripID    string      `json:"tripId,omitempty"`
	Amount    float64     `json:"amount"`
	Note      string      `json:"note"`
	LoggedBy  string      `json:"loggedBy"`
	Vehicle   *VehicleRef `json:"vehicle,omitempty"`
}

type LogExpenseRequest struct {
	VehicleID string  `json:"vehicle_id"`
	TripID    string  `json:"trip_id"`
	Type      string  `json:"type"`
	Amount    float64 `json:"amount"`
	Note      string  `json:"note"`
}

type MaintenanceCost struct {
	ID          string      `json:"id"`
	Title       string      `json:"title"`
	VehicleID   string      `json:"vehicleId"`
	Cost        float64     `json:"cost"`
	Status      string      `json:"status"`
	StartedAt   time.Time   `json:"startedAt"`
	ClosedAt    *time.Time  `json:"closedAt"`
	Category    string      `json:"category"`
	Description string      `json:"description"`
	Vehicle     *VehicleRef `json:"vehicle,omitempty"`
}

type VehicleROI struct {
	VehicleID       string   `json:"vehicleId"`
	Model           string   `json:"model"`
	Type            string   `json:"type"`
	Status          string   `json:"status"`
	AcquisitionCost float64  `json:"acquisitionCost"`
	TripRevenue     float64  `json:"tripRevenue"`
	FuelCost        float64  `json:"fuelCost"`
	MaintenanceCost float64  `json:"maintenanceCost"`
	OtherExpenses   float64  `json:"otherExpenses"`
	NetProfit       float64  `json:"netProfit"`
	ROI             *float64 `json:"roi"`
}

type KPIItem struct {
	Label         string  `json:"label"`
	Value         any     `json:"value"`
	ChangePercent float64 `json:"changePercent"`
	Icon          string  `json:"icon"`
}

type NameValue struct {
	Name  string  `json:"name"`
	Value float64 `json:"value"`
}

type PeriodValue struct {
	Period   string  `json:"period,omitempty"`
	Month    string  `json:"month,omitempty"`
	Revenue  float64 `json:"revenue,omitempty"`
	Expenses float64 `json:"expenses,omitempty"`
	Expense  float64 `json:"expense,omitempty"`
}

type CostVehicle struct {
	Name string  `json:"name"`
	Cost float64 `json:"cost"`
}

type DashboardSummary struct {
	KPIs                    []KPIItem     `json:"kpis"`
	RevenueExpenseData      []PeriodValue `json:"revenueExpenseData"`
	MonthlyExpenseTrendData []PeriodValue `json:"monthlyExpenseTrendData"`
	ExpenseBreakdownData    []NameValue   `json:"expenseBreakdownData"`
	CostIntensiveVehicles   []CostVehicle `json:"costIntensiveVehicles"`
	NetMargin               float64       `json:"netMargin"`
}

type FuelExpenseSummary struct {
	TotalFuelCost        float64 `json:"totalFuelCost"`
	TotalOtherExpenses   float64 `json:"totalOtherExpenses"`
	TotalMaintenance     float64 `json:"totalMaintenance"`
	TotalOperationalCost float64 `json:"totalOperationalCost"`
}

type MaintenanceSummary struct {
	TotalCost   float64           `json:"totalCost"`
	Preventive  float64           `json:"preventive"`
	Corrective  float64           `json:"corrective"`
	AvgDowntime float64           `json:"avgDowntime"`
	Rows        []MaintenanceCost `json:"rows"`
}

type AnalyticsKPIs struct {
	FuelEfficiency   float64 `json:"fuelEfficiency"`
	FleetUtilization float64 `json:"fleetUtilization"`
	OperationalCost  float64 `json:"operationalCost"`
	VehicleROI       float64 `json:"vehicleRoi"`
}

type AnalyticsSummary struct {
	KPIs                  AnalyticsKPIs `json:"kpis"`
	MonthlyRevenueData    []PeriodValue `json:"monthlyRevenueData"`
	CostIntensiveVehicles []CostVehicle `json:"costIntensiveVehicles"`
	ROIRows               []VehicleROI  `json:"roiRows"`
}

type Response struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Data    any    `json:"data,omitempty"`
	Meta    any    `json:"meta,omitempty"`
}
