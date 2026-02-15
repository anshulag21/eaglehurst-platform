# Updated Login Credentials - Test Environment

All user email addresses have been updated to use the `@eaglehursttestdev.co.in` domain to protect actual email addresses in the development environment.

## Admin Account
- **Email**: `admin@eaglehursttestdev.co.in`
- **Password**: `admin123`
- **Role**: Admin
- **Name**: Admin User

## Seller Accounts

### Seller 1 - Dr. James Smith (London GP)
- **Email**: `dr.smith@eaglehursttestdev.co.in`
- **Password**: `seller123`
- **Role**: Seller
- **Business**: London General Practice

### Seller 2 - Dr. Sarah Jones (Manchester Dental)
- **Email**: `dr.jones@eaglehursttestdev.co.in`
- **Password**: `seller123`
- **Role**: Seller
- **Business**: Manchester Dental Excellence

### Seller 3 - Dr. Michael Wilson (Birmingham Physiotherapy)
- **Email**: `dr.wilson@eaglehursttestdev.co.in`
- **Password**: `seller123`
- **Role**: Seller
- **Business**: Birmingham Physiotherapy Centre

### Seller 4 - Dr. Robert Brown (Edinburgh Clinic)
- **Email**: `dr.brown@eaglehursttestdev.co.in`
- **Password**: `seller123`
- **Role**: Seller
- **Business**: Edinburgh Medical Clinic

## Buyer Accounts

### Buyer 1 - James Thompson (Medical Capital Investor)
- **Email**: `james.investor@eaglehursttestdev.co.in`
- **Password**: `buyer123`
- **Role**: Buyer
- **Investment Range**: £500K - £2M

### Buyer 2 - Sarah Mitchell (Health Investment Group)
- **Email**: `sarah.acquisition@eaglehursttestdev.co.in`
- **Password**: `buyer123`
- **Role**: Buyer
- **Investment Range**: £300K - £1.5M

### Buyer 3 - Michael Davies (Practice Acquisition)
- **Email**: `michael.buyer@eaglehursttestdev.co.in`
- **Password**: `buyer123`
- **Role**: Buyer
- **Investment Range**: £200K - £1M

### Buyer 4 - Emma Watson (NHS Partnership Buyer)
- **Email**: `emma.healthcare@eaglehursttestdev.co.in`
- **Password**: `buyer123`
- **Role**: Buyer
- **Investment Range**: £400K - £1.8M

## Additional Test Users

### Test User 1
- **Email**: `test@eaglehursttestdev.co.in`
- **Password**: `buyer123`
- **Role**: Buyer

### Test User 2
- **Email**: `test2@eaglehursttestdev.co.in`
- **Password**: `buyer123`
- **Role**: Buyer

### Aditya Testing
- **Email**: `aditya@eaglehursttestdev.co.in`
- **Password**: `buyer123`
- **Role**: Buyer

### Test User 5
- **Email**: `test5@eaglehursttestdev.co.in`
- **Password**: `buyer123`
- **Role**: Buyer

### Aditya Testing 2
- **Email**: `aditya+1@eaglehursttestdev.co.in`
- **Password**: `buyer123`
- **Role**: Buyer

## Notes

1. **Email Domain Protection**: All emails now use `@eaglehursttestdev.co.in` to protect actual email addresses
2. **Password Security**: These are development passwords only - change in production
3. **Database Updated**: All existing users in the database have been updated
4. **Future Users**: The `create_test_data.py` script has been updated to use the new domain for any new test users

## Scripts Used

- `update_user_emails.py`: Script to update existing user emails in the database
- `create_test_data.py`: Updated to create new users with the test domain

## Verification

Total users updated: **14 users**
All users now have emails ending with `@eaglehursttestdev.co.in`

Last updated: September 21, 2025
