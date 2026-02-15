"""add_submitted_for_review_status

Revision ID: 635db3f0ca55
Revises: 5d9d58d80703
Create Date: 2025-09-22 05:45:43.245042

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '635db3f0ca55'
down_revision = '5d9d58d80703'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Update existing sellers who have submitted documents (have kyc_documents) 
    # from 'pending' to 'submitted_for_review'
    connection = op.get_bind()
    connection.execute(
        sa.text("""
            UPDATE sellers 
            SET verification_status = 'submitted_for_review' 
            WHERE verification_status = 'pending' 
            AND kyc_documents IS NOT NULL 
            AND kyc_documents != '[]'
            AND kyc_documents != 'null'
        """)
    )


def downgrade() -> None:
    # Revert the status change
    connection = op.get_bind()
    connection.execute(
        sa.text("""
            UPDATE sellers 
            SET verification_status = 'pending' 
            WHERE verification_status = 'submitted_for_review'
        """)
    )
