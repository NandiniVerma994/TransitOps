package fleet

import (
	"errors"
	"testing"
	"time"
)

func TestValidateCreateRequest(t *testing.T) {
	s := &Service{}

	tests := []struct {
		name    string
		req     CreateVehicleRequest
		wantErr error
	}{
		{
			name: "Valid request",
			req: CreateVehicleRequest{
				RegistrationNumber: "VAN-05",
				Name:               "Ford Transit",
				Type:               "Van",
				MaxLoadKG:          500,
				OdometerKM:         12000,
				AcquisitionCost:    35000,
			},
			wantErr: nil,
		},
		{
			name: "Missing registration number",
			req: CreateVehicleRequest{
				RegistrationNumber: "",
				Name:               "Ford Transit",
				Type:               "Van",
				MaxLoadKG:          500,
			},
			wantErr: ErrValidation,
		},
		{
			name: "Registration number too short",
			req: CreateVehicleRequest{
				RegistrationNumber: "V",
				Name:               "Ford Transit",
				Type:               "Van",
				MaxLoadKG:          500,
			},
			wantErr: ErrValidation,
		},
		{
			name: "Missing name",
			req: CreateVehicleRequest{
				RegistrationNumber: "VAN-05",
				Name:               "",
				Type:               "Van",
				MaxLoadKG:          500,
			},
			wantErr: ErrValidation,
		},
		{
			name: "Invalid type",
			req: CreateVehicleRequest{
				RegistrationNumber: "VAN-05",
				Name:               "Ford Transit",
				Type:               "Sports Car",
				MaxLoadKG:          500,
			},
			wantErr: ErrValidation,
		},
		{
			name: "Invalid load capacity",
			req: CreateVehicleRequest{
				RegistrationNumber: "VAN-05",
				Name:               "Ford Transit",
				Type:               "Van",
				MaxLoadKG:          -10,
			},
			wantErr: ErrValidation,
		},
		{
			name: "Invalid odometer",
			req: CreateVehicleRequest{
				RegistrationNumber: "VAN-05",
				Name:               "Ford Transit",
				Type:               "Van",
				MaxLoadKG:          500,
				OdometerKM:         -1,
			},
			wantErr: ErrValidation,
		},
		{
			name: "Invalid cost",
			req: CreateVehicleRequest{
				RegistrationNumber: "VAN-05",
				Name:               "Ford Transit",
				Type:               "Van",
				MaxLoadKG:          500,
				AcquisitionCost:    -100,
			},
			wantErr: ErrValidation,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := s.validateCreateRequest(tt.req)
			if tt.wantErr == nil && err != nil {
				t.Fatalf("expected no error, got: %v", err)
			}
			if tt.wantErr != nil {
				if err == nil {
					t.Fatalf("expected error: %v, got nil", tt.wantErr)
				}
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("expected error wrapping %v, got: %v", tt.wantErr, err)
				}
			}
		})
	}
}

func TestValidateOnboardRequest(t *testing.T) {
	s := &Service{}

	tests := []struct {
		name    string
		req     OnboardDriverRequest
		wantErr error
	}{
		{
			name: "Valid request",
			req: OnboardDriverRequest{
				Email:           "sam@transitops.local",
				Name:            "Sam Rivera",
				LicenseNumber:   "DL-1044",
				LicenseCategory: "Light",
				LicenseExpiry:   time.Now().Add(24 * time.Hour),
				ContactNumber:   "+1 555-0833",
			},
			wantErr: nil,
		},
		{
			name: "Invalid email",
			req: OnboardDriverRequest{
				Email:           "invalid-email",
				Name:            "Sam Rivera",
				LicenseNumber:   "DL-1044",
				LicenseCategory: "Light",
				LicenseExpiry:   time.Now().Add(24 * time.Hour),
				ContactNumber:   "+1 555-0833",
			},
			wantErr: ErrValidation,
		},
		{
			name: "Missing name",
			req: OnboardDriverRequest{
				Email:           "sam@transitops.local",
				Name:            "",
				LicenseNumber:   "DL-1044",
				LicenseCategory: "Light",
				LicenseExpiry:   time.Now().Add(24 * time.Hour),
				ContactNumber:   "+1 555-0833",
			},
			wantErr: ErrValidation,
		},
		{
			name: "Expired license",
			req: OnboardDriverRequest{
				Email:           "sam@transitops.local",
				Name:            "Sam Rivera",
				LicenseNumber:   "DL-1044",
				LicenseCategory: "Light",
				LicenseExpiry:   time.Now().Add(-24 * time.Hour),
				ContactNumber:   "+1 555-0833",
			},
			wantErr: ErrValidation,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := s.validateOnboardRequest(tt.req)
			if tt.wantErr == nil && err != nil {
				t.Fatalf("expected no error, got: %v", err)
			}
			if tt.wantErr != nil {
				if err == nil {
					t.Fatalf("expected error: %v, got nil", tt.wantErr)
				}
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("expected error wrapping %v, got: %v", tt.wantErr, err)
				}
			}
		})
	}
}

func TestValidateDispatchTrip(t *testing.T) {
	s := &Service{}

	tests := []struct {
		name    string
		req     DispatchTripRequest
		wantErr error
	}{
		{
			name: "Valid request",
			req: DispatchTripRequest{
				VehicleID:         "vehicle-uuid",
				DriverID:          "driver-uuid",
				Source:            "Depot A",
				Destination:       "Depot B",
				CargoWeightKG:     1500,
				PlannedDistanceKM: 320,
				Revenue:           2500,
			},
			wantErr: nil,
		},
		{
			name: "Same source and destination",
			req: DispatchTripRequest{
				VehicleID:         "vehicle-uuid",
				DriverID:          "driver-uuid",
				Source:            "Depot A",
				Destination:       "Depot A",
				CargoWeightKG:     1500,
				PlannedDistanceKM: 320,
				Revenue:           2500,
			},
			wantErr: ErrValidation,
		},
		{
			name: "Cargo weight zero",
			req: DispatchTripRequest{
				VehicleID:         "vehicle-uuid",
				DriverID:          "driver-uuid",
				Source:            "Depot A",
				Destination:       "Depot B",
				CargoWeightKG:     0,
				PlannedDistanceKM: 320,
				Revenue:           2500,
			},
			wantErr: ErrValidation,
		},
		{
			name: "Negative planned distance",
			req: DispatchTripRequest{
				VehicleID:         "vehicle-uuid",
				DriverID:          "driver-uuid",
				Source:            "Depot A",
				Destination:       "Depot B",
				CargoWeightKG:     1500,
				PlannedDistanceKM: -10,
				Revenue:           2500,
			},
			wantErr: ErrValidation,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := s.validateDispatchTrip(tt.req)
			if tt.wantErr == nil && err != nil {
				t.Fatalf("expected no error, got: %v", err)
			}
			if tt.wantErr != nil {
				if err == nil {
					t.Fatalf("expected error: %v, got nil", tt.wantErr)
				}
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("expected error wrapping %v, got: %v", tt.wantErr, err)
				}
			}
		})
	}
}

func TestValidateStartMaintenance(t *testing.T) {
	s := &Service{}

	tests := []struct {
		name    string
		req     StartMaintenanceRequest
		wantErr error
	}{
		{
			name: "Valid request",
			req: StartMaintenanceRequest{
				VehicleID:     "vehicle-uuid",
				Title:         "Oil Change",
				Description:   "Routine check",
				EstimatedCost: 150,
			},
			wantErr: nil,
		},
		{
			name: "Missing vehicle ID",
			req: StartMaintenanceRequest{
				VehicleID:     "",
				Title:         "Oil Change",
				EstimatedCost: 150,
			},
			wantErr: ErrValidation,
		},
		{
			name: "Missing service type",
			req: StartMaintenanceRequest{
				VehicleID:     "vehicle-uuid",
				Title:         "",
				EstimatedCost: 150,
			},
			wantErr: ErrValidation,
		},
		{
			name: "Negative estimated cost",
			req: StartMaintenanceRequest{
				VehicleID:     "vehicle-uuid",
				Title:         "Oil Change",
				EstimatedCost: -20,
			},
			wantErr: ErrValidation,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := s.validateStartMaintenance(tt.req)
			if tt.wantErr == nil && err != nil {
				t.Fatalf("expected no error, got: %v", err)
			}
			if tt.wantErr != nil {
				if err == nil {
					t.Fatalf("expected error: %v, got nil", tt.wantErr)
				}
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("expected error wrapping %v, got: %v", tt.wantErr, err)
				}
			}
		})
	}
}



