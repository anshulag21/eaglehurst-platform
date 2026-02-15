"""add_user_blocking_functionality

Revision ID: 7fcaf9e6346a
Revises: 635db3f0ca55
Create Date: 2025-09-22 14:27:23.471640

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7fcaf9e6346a'
down_revision = '635db3f0ca55'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create user_blocks table
    op.create_table('user_blocks',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('blocker_id', sa.String(36), nullable=False),
        sa.Column('blocked_id', sa.String(36), nullable=False),
        sa.Column('reason', sa.String(255), nullable=True),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['blocked_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['blocker_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('blocker_id', 'blocked_id', name='unique_block_pair')
    )


def downgrade() -> None:
    # Drop user_blocks table
    op.drop_table('user_blocks')
