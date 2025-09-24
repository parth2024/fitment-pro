# Generated migration to update unique constraints for tenant support

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('data_uploads', '0001_initial'),
    ]

    operations = [
        # Remove the old unique constraint on VCDBData
        migrations.AlterUniqueTogether(
            name='vcdbdata',
            unique_together=set(),
        ),
        
        # Add the new unique constraint that includes tenant
        migrations.AlterUniqueTogether(
            name='vcdbdata',
            unique_together={('year', 'make', 'model', 'submodel', 'drive_type', 'tenant')},
        ),
        
        # Remove the unique constraint on part_id for ProductData
        migrations.AlterField(
            model_name='productdata',
            name='part_id',
            field=models.CharField(max_length=100),
        ),
        
        # Add the new unique constraint that includes tenant
        migrations.AlterUniqueTogether(
            name='productdata',
            unique_together={('part_id', 'tenant')},
        ),
    ]
