"""Add seller_initiated field and make listing_id nullable in connections

Revision ID: 5d9d58d80703
Revises: 
Create Date: 2025-09-22 00:28:19.915178

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5d9d58d80703'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SQLite doesn't support ALTER COLUMN, so we need to recreate the table
    
    # Create new table with updated schema
    op.create_table('connections_new',
        sa.Column('id', sa.CHAR(length=36), nullable=False),
        sa.Column('buyer_id', sa.CHAR(length=36), nullable=False),
        sa.Column('seller_id', sa.CHAR(length=36), nullable=False),
        sa.Column('listing_id', sa.CHAR(length=36), nullable=True),  # Now nullable
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('initial_message', sa.Text(), nullable=True),
        sa.Column('response_message', sa.Text(), nullable=True),
        sa.Column('seller_initiated', sa.Boolean(), nullable=True),  # New field
        sa.Column('requested_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('responded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_activity', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.ForeignKeyConstraint(['buyer_id'], ['buyers.id'], ),
        sa.ForeignKeyConstraint(['listing_id'], ['listings.id'], ),
        sa.ForeignKeyConstraint(['seller_id'], ['sellers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Copy data from old table to new table
    op.execute("""
        INSERT INTO connections_new (
            id, buyer_id, seller_id, listing_id, status, initial_message, 
            response_message, seller_initiated, requested_at, responded_at, last_activity
        )
        SELECT 
            id, buyer_id, seller_id, listing_id, status, initial_message, 
            response_message, 0 as seller_initiated, requested_at, responded_at, last_activity
        FROM connections
    """)
    
    # Drop old table
    op.drop_table('connections')
    
    # Rename new table
    op.rename_table('connections_new', 'connections')


def downgrade() -> None:
    # Recreate table with original schema (listing_id not nullable, no seller_initiated)
    
    # Create old table structure
    op.create_table('connections_old',
        sa.Column('id', sa.CHAR(length=36), nullable=False),
        sa.Column('buyer_id', sa.CHAR(length=36), nullable=False),
        sa.Column('seller_id', sa.CHAR(length=36), nullable=False),
        sa.Column('listing_id', sa.CHAR(length=36), nullable=False),  # Back to not nullable
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('initial_message', sa.Text(), nullable=True),
        sa.Column('response_message', sa.Text(), nullable=True),
        sa.Column('requested_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('responded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_activity', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.ForeignKeyConstraint(['buyer_id'], ['buyers.id'], ),
        sa.ForeignKeyConstraint(['listing_id'], ['listings.id'], ),
        sa.ForeignKeyConstraint(['seller_id'], ['sellers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Copy data (only records with listing_id not null)
    op.execute("""
        INSERT INTO connections_old (
            id, buyer_id, seller_id, listing_id, status, initial_message, 
            response_message, requested_at, responded_at, last_activity
        )
        SELECT 
            id, buyer_id, seller_id, listing_id, status, initial_message, 
            response_message, requested_at, responded_at, last_activity
        FROM connections
        WHERE listing_id IS NOT NULL
    """)
    
    # Drop current table
    op.drop_table('connections')
    
    # Rename old table
    op.rename_table('connections_old', 'connections')
